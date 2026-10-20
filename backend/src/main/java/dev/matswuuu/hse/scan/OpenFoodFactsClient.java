package dev.matswuuu.hse.scan;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static dev.matswuuu.hse.common.LogText.describe;

/**
 * Barcode lookup in Open Food Facts: open data with a large catalog of products sold in Russia
 * (names in Russian, nutrition per 100 g from the package). No key needed, only a User-Agent.
 */
@Component
public class OpenFoodFactsClient {

    private static final Logger log = LoggerFactory.getLogger(OpenFoodFactsClient.class);

    private static final String FIELDS =
            "product_name,product_name_ru,generic_name_ru,brands,quantity,nutriments,categories_tags";

    /** Open Food Facts category tag fragments -> catalog category, checked in order. */
    private static final Map<String, String> CATEGORIES = new LinkedHashMap<>();

    static {
        CATEGORIES.put("eggs", "яйца");
        CATEGORIES.put("poultr", "птица");
        CATEGORIES.put("chicken", "птица");
        CATEGORIES.put("fish", "рыба");
        CATEGORIES.put("seafood", "рыба");
        CATEGORIES.put("meat", "мясо");
        CATEGORIES.put("sausage", "мясо");
        CATEGORIES.put("dair", "молочные");
        CATEGORIES.put("milk", "молочные");
        CATEGORIES.put("cheese", "молочные");
        CATEGORIES.put("yogurt", "молочные");
        CATEGORIES.put("kefir", "молочные");
        CATEGORIES.put("nut", "орехи");
        CATEGORIES.put("legume", "бобовые");
        CATEGORIES.put("bean", "бобовые");
        CATEGORIES.put("bread", "хлеб");
        CATEGORIES.put("cereal", "крупы");
        CATEGORIES.put("pasta", "крупы");
        CATEGORIES.put("rice", "крупы");
        CATEGORIES.put("oil", "масла");
        CATEGORIES.put("vegetable", "овощи");
        CATEGORIES.put("fruit", "фрукты");
    }

    public record OffProduct(
            String barcode, String name, String category, Double kcal, Double protein, Double fat, Double carbs) {

        public boolean hasNutrition() {
            return kcal != null && protein != null && fat != null && carbs != null;
        }
    }

    private final RestClient client;
    private final ObjectMapper objectMapper;

    public OpenFoodFactsClient(
            ObjectMapper objectMapper,
            @Value("${scan.open-food-facts.url:https://world.openfoodfacts.org}") String baseUrl,
            @Value("${scan.open-food-facts.user-agent:HSECompetition/1.0 (https://hse-competition.matswuuu.dev)}")
                    String userAgent) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        this.client = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader("User-Agent", userAgent)
                .build();
        this.objectMapper = objectMapper;
    }

    /** Empty when the code is unknown or the service is unreachable. */
    public Optional<OffProduct> find(String barcode) {
        try {
            String body = client.get()
                    .uri("/api/v2/product/{code}?fields={fields}&lc=ru", barcode, FIELDS)
                    .retrieve()
                    .onStatus(status -> status.value() == 404, (req, res) -> {})
                    .body(String.class);
            if (body == null) {
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(body);
            if (root.path("status").asInt(0) != 1) {
                return Optional.empty();
            }
            return Optional.ofNullable(toProduct(barcode, root.path("product")));
        } catch (Exception e) {
            log.warn("Open Food Facts lookup for {} failed: {}", barcode, describe(e));
            return Optional.empty();
        }
    }

    static OffProduct toProduct(String barcode, JsonNode product) {
        String name = firstText(product, "product_name_ru", "product_name", "generic_name_ru");
        if (name == null) {
            return null;
        }
        String brand = VisionClient.text(product, "brands");
        if (brand != null) {
            brand = brand.split(",")[0].strip();
            if (!name.toLowerCase().contains(brand.toLowerCase())) {
                name = name + " " + brand;
            }
        }
        JsonNode n = product.path("nutriments");
        Double kcal = VisionClient.number(n, "energy-kcal_100g");
        if (kcal == null) {
            Double kj = VisionClient.number(n, "energy_100g");
            kcal = kj == null ? null : Math.round(kj / 4.184 * 10.0) / 10.0;
        }
        return new OffProduct(
                barcode, name, category(product), kcal, VisionClient.number(n, "proteins_100g"),
                VisionClient.number(n, "fat_100g"), VisionClient.number(n, "carbohydrates_100g"));
    }

    private static String category(JsonNode product) {
        StringBuilder tags = new StringBuilder();
        for (JsonNode tag : product.path("categories_tags").values()) {
            tags.append(tag.asString("")).append(' ');
        }
        String all = tags.toString();
        for (Map.Entry<String, String> entry : CATEGORIES.entrySet()) {
            if (all.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return "прочее";
    }

    private static String firstText(JsonNode node, String... fields) {
        for (String field : fields) {
            String value = VisionClient.text(node, field);
            if (value != null) {
                return value;
            }
        }
        return null;
    }
}
