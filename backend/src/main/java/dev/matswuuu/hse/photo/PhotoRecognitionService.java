package dev.matswuuu.hse.photo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.photo.dto.PhotoRecognitionResponse;
import dev.matswuuu.hse.photo.dto.RecognizedItem;
import dev.matswuuu.hse.plan.PlanNutritionService;
import dev.matswuuu.hse.plan.dto.NutritionFacts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.content.Media;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Calories from a photo (§4.9, P2): the vision model only names foods and estimates grams,
 * КБЖУ is computed by code from the product DB, same rule as for plans (§4.3).
 * Needs the LLM profile ({@code nutrition.llm.enabled=true} and a configured model).
 */
@Service
public class PhotoRecognitionService {

    private static final Logger log = LoggerFactory.getLogger(PhotoRecognitionService.class);

    /** Formats Gemini accepts as inline image data. */
    static final Set<String> SUPPORTED_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp", "image/heic", "image/heif");

    private static final int MAX_ITEMS = 12;
    private static final double MAX_GRAMS = 2000;

    private final ObjectProvider<ChatModel> chatModel;
    private final PlanNutritionService nutritionService;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    public PhotoRecognitionService(
            ObjectProvider<ChatModel> chatModel,
            PlanNutritionService nutritionService,
            ObjectMapper objectMapper,
            @Value("${nutrition.llm.enabled:false}") boolean enabled) {
        this.chatModel = chatModel;
        this.nutritionService = nutritionService;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
    }

    public boolean available() {
        return enabled && chatModel.getIfAvailable() != null;
    }

    public PhotoRecognitionResponse recognize(byte[] image, String contentType) {
        if (!available()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Photo recognition is not configured");
        }
        if (image.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
        }
        if (contentType == null || !SUPPORTED_TYPES.contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported image type");
        }

        Map<String, Product> index = nutritionService.productIndex();
        String answer;
        try {
            var message = UserMessage.builder()
                    .text(buildPrompt(index))
                    .media(new Media(MimeType.valueOf(contentType), new ByteArrayResource(image)))
                    .build();
            answer = chatModel.getObject().call(new Prompt(message)).getResult().getOutput().getText();
        } catch (Exception e) {
            log.warn("Photo recognition call failed", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Recognition failed");
        }
        return toResponse(parse(answer), index);
    }

    private String buildPrompt(Map<String, Product> index) {
        String products = index.values().stream()
                .map(Product::getName)
                .distinct()
                .sorted()
                .collect(Collectors.joining("; "));
        return """
                На фото — блюдо или тарелка с едой. Определи продукты и оцени их массу. Ответь СТРОГО одним JSON без пояснений.
                Схема: {"items":[{"name":"название по-русски","productName":"название из списка или null",
                "grams":масса на тарелке в граммах,"productGrams":масса в состоянии продукта из списка}]}
                Правила:
                - productName ТОЛЬКО из списка (дословно), иначе null: %s
                - grams — масса в том виде, как на фото (готовое блюдо)
                - productGrams — та же порция в состоянии продукта из списка: крупы, макароны и бобовые
                  в сухом виде (варёные примерно в 2,5–3 раза тяжелее сухих), мясо, рыба и птица в сыром виде
                  (готовые примерно на 25%% легче сырых); для остальных productGrams = grams
                - масло, соусы и заправки указывай отдельно, если они заметны
                - не более %d позиций; если еды на фото нет — {"items":[]}
                """
                .formatted(products, MAX_ITEMS);
    }

    private List<LlmItem> parse(String answer) {
        if (answer == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty recognition answer");
        }
        int start = answer.indexOf('{');
        int end = answer.lastIndexOf('}');
        if (start < 0 || end <= start) {
            log.warn("Photo recognition answer is not JSON: {}", answer);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Recognition answer is not JSON");
        }
        try {
            LlmAnswer parsed = objectMapper.readValue(answer.substring(start, end + 1), LlmAnswer.class);
            return parsed.items() == null ? List.of() : parsed.items();
        } catch (Exception e) {
            log.warn("Cannot parse photo recognition answer: {}", answer, e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cannot parse recognition answer");
        }
    }

    private PhotoRecognitionResponse toResponse(List<LlmItem> items, Map<String, Product> index) {
        List<RecognizedItem> result = new ArrayList<>();
        NutritionFacts total = NutritionFacts.ZERO;
        for (LlmItem item : items) {
            if (result.size() == MAX_ITEMS) {
                break;
            }
            if (item.name() == null || item.name().isBlank() || item.grams() == null || !(item.grams() > 0)) {
                continue;
            }
            double grams = Math.min(Math.round(item.grams()), MAX_GRAMS);
            Product product = resolve(item, index);
            NutritionFacts facts = null;
            if (product != null) {
                // Products are stored dry/raw, so КБЖУ comes from the dry/raw equivalent of the portion.
                double productGrams = item.productGrams() != null && item.productGrams() > 0 ? Math.min(item.productGrams(), MAX_GRAMS) : grams;
                double ratio = productGrams / 100.0;
                facts = new NutritionFacts(
                        product.getKcalPer100g() * ratio,
                        product.getProteinPer100g() * ratio,
                        product.getFatPer100g() * ratio,
                        product.getCarbsPer100g() * ratio);
                total = total.add(facts);
            }
            result.add(new RecognizedItem(
                    item.name().strip(), product == null ? null : product.getName(), grams, facts));
        }
        return new PhotoRecognitionResponse(result, total);
    }

    private Product resolve(LlmItem item, Map<String, Product> index) {
        if (item.productName() != null && !item.productName().isBlank()) {
            Product product = nutritionService.resolve(item.productName(), index);
            if (product != null) {
                return product;
            }
        }
        return nutritionService.resolve(item.name(), index);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record LlmAnswer(List<LlmItem> items) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record LlmItem(String name, String productName, Double grams, Double productGrams) {}
}
