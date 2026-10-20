package dev.matswuuu.hse.purchase;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static dev.matswuuu.hse.common.LogText.*;

/**
 * Receipt contents by its fiscal QR code via proverkacheka.com ({@code POST /api/v1/check/get},
 * form fields {@code token} + {@code qrraw} or {@code qrfile}). The answer carries the receipt in
 * the ФНС JSON format: money in kopecks, {@code items[]} with name/price/quantity/sum.
 * Needs {@code PROVERKACHEKA_TOKEN}; without it receipt import is reported as unavailable.
 */
@Component
public class ReceiptClient {

    private static final Logger log = LoggerFactory.getLogger(ReceiptClient.class);

    private static final DateTimeFormatter QR_TIME = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmm[ss]");
    private static final ZoneId RECEIPT_ZONE = ZoneId.of("Europe/Moscow");

    public record Line(String name, BigDecimal price, double quantity, BigDecimal sum) {}

    public record Receipt(LocalDateTime dateTime, String store, BigDecimal total, String fiscalKey, List<Line> lines) {}

    private final RestClient client;
    private final ObjectMapper objectMapper;
    private final String token;

    public ReceiptClient(
            ObjectMapper objectMapper,
            @Value("${receipts.proverkacheka.url:https://proverkacheka.com}") String baseUrl,
            @Value("${receipts.proverkacheka.token:}") String token) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(requestFactory).build();
        this.objectMapper = objectMapper;
        this.token = token == null ? "" : token.strip();
    }

    public boolean available() {
        return !token.isEmpty();
    }

    /** By the QR text: "t=20260920T1837&s=349.93&fn=…&i=…&fp=…&n=1". */
    public Receipt byQr(String qrRaw) {
        Map<String, String> qr = parseQr(qrRaw);
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("qrraw", qrRaw.strip());
        return call(form, qr);
    }

    /** By a photo of the receipt, when the QR code could not be decoded locally. */
    public Receipt byImage(byte[] image) {
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("qrfile", new ByteArrayResource(image) {
            @Override
            public String getFilename() {
                return "receipt.jpg";
            }
        });
        return call(form, Map.of());
    }

    private Receipt call(MultiValueMap<String, Object> form, Map<String, String> qr) {
        if (!available()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Receipt service is not configured");
        }
        form.add("token", token);
        long started = System.nanoTime();
        String body;
        try {
            body = client.post()
                    .uri("/api/v1/check/get")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(form)
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.warn("proverkacheka call failed after {} ms: {}", elapsedMs(started), describe(e));
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Receipt service failed");
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(body == null ? "{}" : body);
        } catch (Exception e) {
            log.warn("proverkacheka answer is not JSON: {}", truncate(body));
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Receipt service answer is invalid");
        }
        int code = root.path("code").asInt(-1);
        // 1 = data received; 0 = invalid receipt; 2/4 = not received yet / wait before retrying; 3 = request limit.
        switch (code) {
            case 1 -> {}
            case 0 -> throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Receipt is invalid");
            case 2, 4 -> throw new ResponseStatusException(HttpStatus.CONFLICT, "Receipt data is not available yet");
            case 3 -> throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Receipt request limit reached");
            default -> {
                log.warn("proverkacheka answered code {} after {} ms: {}", code, elapsedMs(started), truncate(body));
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Receipt service failed");
            }
        }
        JsonNode json = root.path("data").path("json");
        Receipt receipt = toReceipt(json, qr);
        log.info("Receipt fetched in {} ms: {} lines, total {}", elapsedMs(started), receipt.lines().size(), receipt.total());
        return receipt;
    }

    static Receipt toReceipt(JsonNode json, Map<String, String> qr) {
        List<Line> lines = new ArrayList<>();
        for (JsonNode item : json.path("items").values()) {
            String name = item.path("name").asString("").strip();
            if (name.isEmpty()) {
                continue;
            }
            double quantity = item.path("quantity").asDouble(1);
            BigDecimal sum = kopecks(item.path("sum"));
            BigDecimal price = item.path("price").isMissingNode() ? sum : kopecks(item.path("price"));
            lines.add(new Line(name, price, quantity, sum));
        }
        BigDecimal total = json.path("totalSum").isMissingNode()
                ? lines.stream().map(Line::sum).reduce(BigDecimal.ZERO, BigDecimal::add)
                : kopecks(json.path("totalSum"));
        String store = firstText(json, "retailPlace", "user");
        String fn = firstText(json, "fiscalDriveNumber");
        String fd = firstText(json, "fiscalDocumentNumber");
        String fp = firstText(json, "fiscalSign");
        String fiscalKey = fn != null && fd != null && fp != null
                ? fn + "/" + fd + "/" + fp
                : qr.containsKey("fn") ? qr.get("fn") + "/" + qr.get("i") + "/" + qr.get("fp") : null;
        return new Receipt(dateTime(json.path("dateTime"), qr), store, total, fiscalKey, lines);
    }

    /** QR parameters; rejects text that is not a fiscal receipt QR. */
    static Map<String, String> parseQr(String qrRaw) {
        Map<String, String> result = new HashMap<>();
        if (qrRaw != null) {
            for (String pair : qrRaw.strip().split("&")) {
                int eq = pair.indexOf('=');
                if (eq > 0) {
                    result.put(pair.substring(0, eq).toLowerCase(),
                            URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8));
                }
            }
        }
        if (!result.keySet().containsAll(List.of("t", "s", "fn", "i", "fp"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not a receipt QR code");
        }
        return result;
    }

    private static LocalDateTime dateTime(JsonNode node, Map<String, String> qr) {
        if (node.isNumber()) {
            return LocalDateTime.ofInstant(Instant.ofEpochSecond(node.asLong(0)), RECEIPT_ZONE);
        }
        String text = node.asString("");
        if (!text.isEmpty()) {
            try {
                return LocalDateTime.parse(text.length() == 16 ? text + ":00" : text.substring(0, Math.min(19, text.length())));
            } catch (DateTimeParseException e) {
                // fall through to the QR time
            }
        }
        if (qr.containsKey("t")) {
            try {
                return LocalDateTime.parse(qr.get("t"), QR_TIME);
            } catch (DateTimeParseException e) {
                // fall through
            }
        }
        return LocalDateTime.now(RECEIPT_ZONE);
    }

    private static BigDecimal kopecks(JsonNode node) {
        return BigDecimal.valueOf(node.asLong(0)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private static String firstText(JsonNode node, String... fields) {
        for (String field : fields) {
            JsonNode value = node.path(field);
            if (value.isNumber()) {
                return String.valueOf(value.asLong(0));
            }
            String text = value.asString("").strip();
            if (!text.isEmpty()) {
                return text;
            }
        }
        return null;
    }
}
