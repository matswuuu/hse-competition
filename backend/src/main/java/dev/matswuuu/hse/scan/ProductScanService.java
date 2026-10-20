package dev.matswuuu.hse.scan;

import dev.matswuuu.hse.common.CurrentUser;
import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.food.ProductRepository;
import dev.matswuuu.hse.food.ProductSource;
import dev.matswuuu.hse.food.dto.ProductResponse;
import dev.matswuuu.hse.photo.PhotoRecognitionService;
import dev.matswuuu.hse.plan.PlanNutritionService;
import dev.matswuuu.hse.scan.OpenFoodFactsClient.OffProduct;
import dev.matswuuu.hse.scan.dto.LabelProductRequest;
import dev.matswuuu.hse.scan.dto.ProductScanResponse;
import dev.matswuuu.hse.scan.dto.ProductScanResponse.Status;
import dev.matswuuu.hse.scan.dto.ProductScanResponse.Via;
import dev.matswuuu.hse.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Product from a photo of its package: barcode -> our DB -> Open Food Facts; otherwise the vision
 * model names it and matches it to the catalog. When nothing is known the client asks for a photo
 * of the label, which {@link #createFromLabel} turns into the user's own product.
 */
@Service
public class ProductScanService {

    private static final Logger log = LoggerFactory.getLogger(ProductScanService.class);

    private final BarcodeDecoder barcodeDecoder;
    private final OpenFoodFactsClient openFoodFacts;
    private final VisionClient vision;
    private final ProductRepository productRepository;
    private final PlanNutritionService nutritionService;

    public ProductScanService(
            BarcodeDecoder barcodeDecoder,
            OpenFoodFactsClient openFoodFacts,
            VisionClient vision,
            ProductRepository productRepository,
            PlanNutritionService nutritionService) {
        this.barcodeDecoder = barcodeDecoder;
        this.openFoodFacts = openFoodFacts;
        this.vision = vision;
        this.productRepository = productRepository;
        this.nutritionService = nutritionService;
    }

    @Transactional
    public ProductScanResponse scan(byte[] image, String contentType) {
        checkImage(image, contentType);
        User user = CurrentUser.get();
        Optional<String> decoded = barcodeDecoder.productBarcode(image);
        String barcode = decoded.orElse(null);
        String suggestedName = null;
        if (barcode != null) {
            ProductScanResponse byCode = byBarcode(user, barcode);
            if (byCode.status() == Status.FOUND) {
                log.info("Product scan for user {}: barcode {} found via {}", user.getId(), barcode, byCode.via());
                return byCode;
            }
            suggestedName = byCode.suggestedName();
        }

        Map<String, Product> index = nutritionService.productIndex();
        JsonNode answer = vision.askJson("product scan", identifyPrompt(index), image, contentType);
        if (answer != null && answer.path("isFood").asBoolean(true)) {
            String visionBarcode = VisionClient.text(answer, "barcode");
            if (barcode == null && visionBarcode != null && visionBarcode.matches("\\d{8,14}")) {
                barcode = visionBarcode;
                ProductScanResponse byCode = byBarcode(user, barcode);
                if (byCode.status() == Status.FOUND) {
                    return byCode;
                }
            }
            String name = VisionClient.text(answer, "name");
            if (suggestedName == null) {
                suggestedName = name;
            }
            // Unpackaged food (a banana, a cucumber) is simply a catalog product.
            String catalogName = VisionClient.text(answer, "catalogProductName");
            Product catalog = catalogName == null ? null : nutritionService.resolve(catalogName, index);
            if (catalog != null && !answer.path("packaged").asBoolean(false)) {
                log.info("Product scan for user {}: '{}' matched catalog product '{}'", user.getId(), name, catalog.getName());
                return new ProductScanResponse(Status.FOUND, ProductResponse.from(catalog), barcode, name, Via.VISION);
            }
            JsonNode per100 = answer.path("nutritionPer100g");
            if (name != null && per100.isObject() && macrosComplete(per100)) {
                Product created = saveUserProduct(user, name, barcode, categoryOf(answer, name, index),
                        VisionClient.number(per100, "kcal"), VisionClient.number(per100, "protein"),
                        VisionClient.number(per100, "fat"), VisionClient.number(per100, "carbs"));
                return new ProductScanResponse(Status.FOUND, ProductResponse.from(created), barcode, name, Via.VISION);
            }
        }
        log.info("Product scan for user {}: unknown (barcode {}, suggested '{}'), asking for the label",
                user.getId(), barcode, suggestedName);
        return new ProductScanResponse(Status.NEED_LABEL, null, barcode, suggestedName, Via.NONE);
    }

    /** The user's own product from a label photo and/or macros typed in. */
    @Transactional
    public ProductResponse createFromLabel(LabelProductRequest request, byte[] labelImage, String contentType) {
        User user = CurrentUser.get();
        Map<String, Product> index = nutritionService.productIndex();
        Double kcal = request.kcal();
        Double protein = request.protein();
        Double fat = request.fat();
        Double carbs = request.carbs();
        String category = request.category();
        if (labelImage != null && labelImage.length > 0) {
            checkImage(labelImage, contentType);
            JsonNode answer = vision.askJson("label", labelPrompt(request.name(), index), labelImage, contentType);
            if (answer != null) {
                kcal = kcal != null ? kcal : VisionClient.number(answer, "kcal");
                protein = protein != null ? protein : VisionClient.number(answer, "protein");
                fat = fat != null ? fat : VisionClient.number(answer, "fat");
                carbs = carbs != null ? carbs : VisionClient.number(answer, "carbs");
                if (category == null) {
                    category = categoryOf(answer, request.name(), index);
                }
            }
        }
        if (kcal == null || protein == null || fat == null || carbs == null) {
            // The client then shows the macro fields for manual entry.
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Nutrition facts are missing");
        }
        if (category == null) {
            category = categoryOf(null, request.name(), index);
        }
        Product product = saveUserProduct(user, request.name().strip(), request.barcode(), category, kcal, protein, fat, carbs);
        log.info("User {} created product {} '{}'", user.getId(), product.getId(), product.getName());
        return ProductResponse.from(product);
    }

    private ProductScanResponse byBarcode(User user, String barcode) {
        List<Product> known = productRepository.findVisibleByBarcode(user.getId(), barcode);
        if (!known.isEmpty()) {
            // The user's own version wins over a shared one.
            Product best = known.stream().filter(p -> p.getOwner() != null).findFirst().orElse(known.getFirst());
            return new ProductScanResponse(Status.FOUND, ProductResponse.from(best), barcode, best.getName(), Via.BARCODE_LOCAL);
        }
        Optional<OffProduct> off = openFoodFacts.find(barcode);
        if (off.isPresent() && off.get().hasNutrition()) {
            OffProduct p = off.get();
            Product product = new Product(uniqueName(p.name()), p.category(), p.kcal(), p.protein(), p.fat(), p.carbs());
            product.setBarcode(barcode);
            product.setSource(ProductSource.OPEN_FOOD_FACTS);
            product = productRepository.save(product);
            return new ProductScanResponse(Status.FOUND, ProductResponse.from(product), barcode, p.name(), Via.OPEN_FOOD_FACTS);
        }
        return new ProductScanResponse(
                Status.NEED_LABEL, null, barcode, off.map(OffProduct::name).orElse(null), Via.NONE);
    }

    private Product saveUserProduct(
            User user, String name, String barcode, String category, double kcal, double protein, double fat, double carbs) {
        Product product = new Product(uniqueName(name), category, kcal, protein, fat, carbs);
        product.setBarcode(barcode);
        product.setSource(ProductSource.USER);
        product.setOwner(user);
        return productRepository.save(product);
    }

    /** Product names are unique across the table: "Кефир" -> "Кефир (2)". */
    private String uniqueName(String name) {
        String base = name.length() > 240 ? name.substring(0, 240) : name;
        String candidate = base;
        for (int n = 2; productRepository.findByName(candidate).isPresent(); n++) {
            candidate = base + " (" + n + ")";
        }
        return candidate;
    }

    private String categoryOf(JsonNode answer, String name, Map<String, Product> index) {
        String category = answer == null ? null : VisionClient.text(answer, "category");
        List<String> known = productRepository.findAllCategories();
        if (category != null && known.contains(category.toLowerCase())) {
            return category.toLowerCase();
        }
        Product catalog = nutritionService.matchCatalog(name, index);
        return catalog != null ? catalog.getCategory() : "прочее";
    }

    private static boolean macrosComplete(JsonNode per100) {
        return VisionClient.number(per100, "kcal") != null && VisionClient.number(per100, "protein") != null
                && VisionClient.number(per100, "fat") != null && VisionClient.number(per100, "carbs") != null;
    }

    private String identifyPrompt(Map<String, Product> index) {
        return """
                На фото — продукт питания (упаковка, этикетка или сам продукт). Определи его. Ответь СТРОГО одним JSON без пояснений.
                Схема: {"isFood":bool,"packaged":bool,"name":"название по-русски с брендом, как на упаковке",
                "barcode":"цифры штрихкода, если он читается, иначе null",
                "catalogProductName":"название из списка или null","category":"категория из списка или null",
                "nutritionPer100g":{"kcal":число,"protein":число,"fat":число,"carbs":число} или null}
                Правила:
                - catalogProductName ТОЛЬКО из списка (дословно), если продукт по сути такой же: %s
                - category ТОЛЬКО из списка: %s
                - nutritionPer100g заполняй, только если на фото видна таблица пищевой ценности на 100 г, иначе null
                - ничего не выдумывай: если не уверен — null
                """
                .formatted(catalogNames(index), String.join(", ", productRepository.findAllCategories()));
    }

    private String labelPrompt(String name, Map<String, Product> index) {
        return """
                На фото — состав и пищевая ценность упаковки продукта «%s». Перепиши пищевую ценность на 100 г (или 100 мл).
                Ответь СТРОГО одним JSON без пояснений: {"kcal":число,"protein":число,"fat":число,"carbs":число,"category":"категория"}
                Правила:
                - числа только с этикетки; если указано на порцию — пересчитай на 100 г; если не видно — null
                - энергетическую ценность бери в ккал (не в кДж)
                - category ТОЛЬКО из списка: %s
                """
                .formatted(name.replace('"', '\''), String.join(", ", productRepository.findAllCategories()));
    }

    private static String catalogNames(Map<String, Product> index) {
        return index.values().stream().map(Product::getName).distinct().sorted().collect(Collectors.joining("; "));
    }

    private static void checkImage(byte[] image, String contentType) {
        if (image == null || image.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
        }
        if (contentType == null || !PhotoRecognitionService.SUPPORTED_TYPES.contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported image type");
        }
    }
}
