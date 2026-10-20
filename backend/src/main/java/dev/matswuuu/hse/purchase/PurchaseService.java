package dev.matswuuu.hse.purchase;

import dev.matswuuu.hse.common.CurrentUser;
import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.plan.PlanNutritionService;
import dev.matswuuu.hse.purchase.ReceiptClient.Line;
import dev.matswuuu.hse.purchase.ReceiptClient.Receipt;
import dev.matswuuu.hse.purchase.dto.ManualPurchaseRequest;
import dev.matswuuu.hse.purchase.dto.PurchaseResponse;
import dev.matswuuu.hse.purchase.dto.ReceiptImportResponse;
import dev.matswuuu.hse.purchase.dto.SpendingResponse;
import dev.matswuuu.hse.purchase.dto.SpendingResponse.Bucket;
import dev.matswuuu.hse.purchase.dto.SpendingResponse.CategoryTotal;
import dev.matswuuu.hse.purchase.dto.SpendingResponse.Period;
import dev.matswuuu.hse.scan.BarcodeDecoder;
import dev.matswuuu.hse.scan.VisionClient;
import dev.matswuuu.hse.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PurchaseService {

    private static final Logger log = LoggerFactory.getLogger(PurchaseService.class);

    static final ZoneId ZONE = ZoneId.of("Europe/Moscow");

    private static final Pattern SIZE = Pattern.compile(
            "(\\d+(?:[.,]\\d+)?)\\s*(кг|гр|г|л|мл)(?![а-яa-z])", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    /** Receipt line stems that are certainly not food. */
    private static final List<String> NON_FOOD_WORDS = List.of(
            "пакет", "майка", "салфет", "туалетн", "бумаг", "шампун", "мыло", "гель", "порош", "средств",
            "губк", "батар", "зубн", "пленк", "плёнк", "фольг", "кондиционер", "дезодор", "бритв", "прокладк",
            "подгузн", "сигарет", "зажигал", "доставк", "корм для", "наполнит", "лампа", "перчатк");

    private final PurchaseRepository purchaseRepository;
    private final ReceiptClient receiptClient;
    private final BarcodeDecoder barcodeDecoder;
    private final PlanNutritionService nutritionService;
    private final VisionClient vision;
    private final TransactionTemplate transaction;

    public PurchaseService(
            PurchaseRepository purchaseRepository,
            ReceiptClient receiptClient,
            BarcodeDecoder barcodeDecoder,
            PlanNutritionService nutritionService,
            VisionClient vision,
            PlatformTransactionManager transactionManager) {
        this.purchaseRepository = purchaseRepository;
        this.receiptClient = receiptClient;
        this.barcodeDecoder = barcodeDecoder;
        this.nutritionService = nutritionService;
        this.vision = vision;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    public boolean receiptsAvailable() {
        return receiptClient.available();
    }

    /**
     * Receipt by a photo of its QR code: decoded here, else the photo goes to the receipt service.
     * Not transactional: the remote calls must not hold a DB connection, only saving does.
     */
    public ReceiptImportResponse importReceiptPhoto(byte[] image) {
        if (image == null || image.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
        }
        return barcodeDecoder.receiptQr(image)
                .map(this::importReceiptQr)
                .orElseGet(() -> save(receiptClient.byImage(image)));
    }

    public ReceiptImportResponse importReceiptQr(String qrRaw) {
        // Validates the QR before spending a request on it.
        ReceiptClient.parseQr(qrRaw);
        return save(receiptClient.byQr(qrRaw));
    }

    private ReceiptImportResponse save(Receipt receipt) {
        User user = CurrentUser.get();
        // Classify first: it may call the LLM.
        List<Classified> classified = classify(receipt.lines().stream().map(Line::name).toList());
        return transaction.execute(status -> save(user, receipt, classified));
    }

    private ReceiptImportResponse save(User user, Receipt receipt, List<Classified> classified) {
        if (receipt.fiscalKey() != null) {
            var existing = purchaseRepository.findFirstByUserIdAndFiscalKey(user.getId(), receipt.fiscalKey());
            if (existing.isPresent()) {
                return new ReceiptImportResponse(PurchaseResponse.from(existing.get()), true);
            }
        }
        Purchase purchase = new Purchase(user, receipt.dateTime(), PurchaseSource.RECEIPT);
        purchase.setStore(receipt.store());
        purchase.setTotal(receipt.total());
        purchase.setFiscalKey(receipt.fiscalKey());
        for (int i = 0; i < receipt.lines().size(); i++) {
            Line line = receipt.lines().get(i);
            PurchaseItem item = new PurchaseItem(purchase, truncate(line.name(), 500), classified.get(i).category());
            item.setProduct(classified.get(i).product());
            item.setPrice(line.price());
            item.setQuantity(line.quantity());
            item.setSum(line.sum());
            item.setGrams(item.isFood() ? grams(line.name(), line.quantity()) : null);
            purchase.getItems().add(item);
        }
        purchase = purchaseRepository.save(purchase);
        log.info("User {} imported receipt {} ({} lines, {} ₽)",
                user.getId(), purchase.getId(), purchase.getItems().size(), purchase.getTotal());
        return new ReceiptImportResponse(PurchaseResponse.from(purchase), false);
    }

    /** Price typed in when a product is added to the fridge. */
    @Transactional
    public void recordManual(User user, String name, String category, Product product, BigDecimal price, Double grams) {
        Purchase purchase = new Purchase(user, LocalDateTime.now(ZONE), PurchaseSource.MANUAL);
        purchase.setTotal(price);
        PurchaseItem item = new PurchaseItem(purchase, truncate(name, 500), category);
        item.setProduct(product);
        item.setPrice(price);
        item.setQuantity(1);
        item.setSum(price);
        item.setGrams(grams);
        purchase.getItems().add(item);
        purchaseRepository.save(purchase);
    }

    public PurchaseResponse addManual(ManualPurchaseRequest request) {
        User user = CurrentUser.get();
        LocalDate date = request.date() == null ? LocalDate.now(ZONE) : request.date();
        LocalDateTime at = date.equals(LocalDate.now(ZONE)) ? LocalDateTime.now(ZONE) : date.atTime(12, 0);
        Purchase purchase = new Purchase(user, at, PurchaseSource.MANUAL);
        purchase.setTotal(request.price());
        Classified c = request.category() != null && !request.category().isBlank()
                ? new Classified(nutritionService.matchCatalog(request.name(), nutritionService.productIndex()),
                        request.category().strip().toLowerCase(Locale.ROOT))
                : classify(List.of(request.name())).getFirst();
        PurchaseItem item = new PurchaseItem(purchase, request.name().strip(), c.category());
        item.setProduct(c.product());
        item.setPrice(request.price());
        item.setQuantity(1);
        item.setSum(request.price());
        purchase.getItems().add(item);
        return transaction.execute(status -> PurchaseResponse.from(purchaseRepository.save(purchase)));
    }

    @Transactional(readOnly = true)
    public List<PurchaseResponse> recent() {
        return purchaseRepository.findTop50ByUserIdOrderByPurchasedAtDesc(CurrentUser.get().getId()).stream()
                .map(PurchaseResponse::from)
                .toList();
    }

    @Transactional
    public void delete(Long id) {
        Purchase purchase = purchaseRepository.findById(id)
                .filter(p -> p.getUser().getId().equals(CurrentUser.get().getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase not found"));
        purchaseRepository.delete(purchase);
    }

    @Transactional(readOnly = true)
    public SpendingResponse spending(Period period) {
        return spending(CurrentUser.get(), period, LocalDate.now(ZONE));
    }

    SpendingResponse spending(User user, Period period, LocalDate today) {
        LocalDate lastStart = bucketStart(period, today);
        int count = period == Period.DAY ? 14 : 12;
        LocalDate from = switch (period) {
            case DAY -> lastStart.minusDays(count - 1);
            case WEEK -> lastStart.minusWeeks(count - 1);
            case MONTH -> lastStart.minusMonths(count - 1);
        };
        LocalDate to = switch (period) {
            case DAY -> lastStart.plusDays(1);
            case WEEK -> lastStart.plusWeeks(1);
            case MONTH -> lastStart.plusMonths(1);
        };
        Map<LocalDate, BigDecimal> buckets = new TreeMap<>();
        for (LocalDate d = from; d.isBefore(to); d = next(period, d)) {
            buckets.put(d, BigDecimal.ZERO);
        }
        Map<String, BigDecimal> byCategory = new HashMap<>();
        BigDecimal total = BigDecimal.ZERO;
        for (Purchase purchase : purchaseRepository.findInRange(user.getId(), from.atStartOfDay(), to.atStartOfDay())) {
            LocalDate bucket = bucketStart(period, purchase.getPurchasedAt().toLocalDate());
            for (PurchaseItem item : purchase.getItems()) {
                buckets.merge(bucket, item.getSum(), BigDecimal::add);
                byCategory.merge(item.getCategory(), item.getSum(), BigDecimal::add);
                total = total.add(item.getSum());
            }
        }
        BigDecimal grand = total;
        List<CategoryTotal> categories = byCategory.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .map(e -> new CategoryTotal(e.getKey(), e.getValue(), grand.signum() == 0 ? 0
                        : e.getValue().multiply(BigDecimal.valueOf(100)).divide(grand, 1, RoundingMode.HALF_UP).doubleValue()))
                .toList();
        return new SpendingResponse(
                period, from, to.minusDays(1), total,
                total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP),
                buckets.entrySet().stream().map(e -> new Bucket(e.getKey(), e.getValue())).toList(),
                categories);
    }

    private static LocalDate bucketStart(Period period, LocalDate date) {
        return switch (period) {
            case DAY -> date;
            case WEEK -> date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case MONTH -> date.withDayOfMonth(1);
        };
    }

    private static LocalDate next(Period period, LocalDate date) {
        return switch (period) {
            case DAY -> date.plusDays(1);
            case WEEK -> date.plusWeeks(1);
            case MONTH -> date.plusMonths(1);
        };
    }

    // ---- receipt line classification ----

    record Classified(Product product, String category) {}

    /**
     * Catalog product and spending category per line: catalog match, then non-food words; the rest
     * goes to the LLM in one request when it is configured, else to "прочее".
     */
    List<Classified> classify(List<String> names) {
        Map<String, Product> index = nutritionService.productIndex();
        List<Classified> result = new ArrayList<>(names.size());
        List<Integer> unknown = new ArrayList<>();
        for (int i = 0; i < names.size(); i++) {
            String name = names.get(i);
            Product product = nutritionService.matchCatalog(name, index);
            if (product != null && !isNonFood(name)) {
                result.add(new Classified(product, product.getCategory()));
            } else if (isNonFood(name)) {
                result.add(new Classified(null, PurchaseItem.NON_FOOD));
            } else {
                result.add(new Classified(null, "прочее"));
                unknown.add(i);
            }
        }
        if (!unknown.isEmpty() && vision.available()) {
            classifyWithLlm(names, unknown, result, index);
        }
        return result;
    }

    private void classifyWithLlm(List<String> names, List<Integer> unknown, List<Classified> result, Map<String, Product> index) {
        StringBuilder lines = new StringBuilder();
        for (int i : unknown) {
            lines.append(i).append(": ").append(names.get(i).replace('\n', ' ')).append('\n');
        }
        List<String> categories = index.values().stream().map(Product::getCategory).distinct().sorted().toList();
        String prompt = """
                Ниже строки кассового чека (номер: название). Для каждой определи, что это за товар.
                Ответь СТРОГО одним JSON без пояснений: {"items":[{"i":номер,"food":bool,"category":"категория","productName":"название или null"}]}
                Правила:
                - category для еды ТОЛЬКО из списка: %s; для не-еды (бытовая химия, пакеты и т.п.) food=false
                - productName ТОЛЬКО из списка (дословно), если товар по сути такой же продукт, иначе null: %s
                Строки:
                %s"""
                .formatted(String.join(", ", categories),
                        String.join("; ", index.values().stream().map(Product::getName).distinct().sorted().toList()),
                        lines);
        JsonNode answer = vision.askJson("receipt classification", prompt, null, null);
        if (answer == null) {
            return;
        }
        for (JsonNode item : answer.path("items").values()) {
            int i = item.path("i").asInt(-1);
            if (!unknown.contains(i)) {
                continue;
            }
            if (!item.path("food").asBoolean(true)) {
                result.set(i, new Classified(null, PurchaseItem.NON_FOOD));
                continue;
            }
            String productName = VisionClient.text(item, "productName");
            Product product = productName == null ? null : nutritionService.resolve(productName, index);
            String category = VisionClient.text(item, "category");
            if (product != null) {
                result.set(i, new Classified(product, product.getCategory()));
            } else if (category != null && categories.contains(category.toLowerCase(Locale.ROOT))) {
                result.set(i, new Classified(null, category.toLowerCase(Locale.ROOT)));
            }
        }
    }

    static boolean isNonFood(String name) {
        String lower = name.toLowerCase(Locale.forLanguageTag("ru"));
        return NON_FOOD_WORDS.stream().anyMatch(lower::contains);
    }

    /**
     * Weight/volume of the line in grams: weighed goods have a fractional quantity in kg,
     * packaged ones carry the size in the name ("МОЛОКО 3,2% 930МЛ" × 2 -> 1860).
     */
    static Double grams(String name, double quantity) {
        boolean weighed = quantity > 0 && quantity != Math.rint(quantity);
        if (weighed) {
            return Math.round(quantity * 1000 * 10.0) / 10.0;
        }
        Matcher m = SIZE.matcher(name);
        Double size = null;
        while (m.find()) {
            double value = Double.parseDouble(m.group(1).replace(',', '.'));
            String unit = m.group(2).toLowerCase(Locale.ROOT);
            size = switch (unit) {
                case "кг", "л" -> value * 1000;
                default -> value;
            };
        }
        if (size == null || size <= 0) {
            return null;
        }
        return Math.round(size * Math.max(1, quantity) * 10.0) / 10.0;
    }

    private static String truncate(String text, int max) {
        String s = text.strip();
        return s.length() <= max ? s : s.substring(0, max);
    }
}
