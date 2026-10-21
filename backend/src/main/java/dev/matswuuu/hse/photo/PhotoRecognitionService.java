package dev.matswuuu.hse.photo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import dev.matswuuu.hse.common.CurrentUser;
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
import java.util.function.Function;
import java.util.stream.Collectors;

import static dev.matswuuu.hse.common.LogText.*;

/**
 * Calories from a photo or a text description (§4.9, P2): the model only names foods and estimates grams,
 * КБЖУ is computed by code from the product DB, same rule as for plans (§4.3).
 * Needs the LLM profile ({@code nutrition.llm.enabled=true} and a configured model).
 */
@Service
public class PhotoRecognitionService {

    private static final Logger log = LoggerFactory.getLogger(PhotoRecognitionService.class);

    /** Formats Gemini accepts as inline image data. */
    public static final Set<String> SUPPORTED_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp", "image/heic", "image/heif");

    private static final int MAX_ITEMS = 12;
    private static final double MAX_GRAMS = 2000;
    private static final int MAX_DESCRIPTION = 1000;

    private static final String PHOTO_INTRO = "На фото — блюдо или тарелка с едой. Определи продукты и оцени их массу.";
    private static final String TEXT_INTRO = "Пользователь описал словами, что он съел. Определи продукты и оцени их массу; "
            + "если масса не указана, возьми обычную порцию взрослого.";

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
        requireAvailable();
        if (image.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
        }
        if (contentType == null || !SUPPORTED_TYPES.contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported image type");
        }
        return recognize(
                PHOTO_INTRO,
                prompt -> UserMessage.builder()
                        .text(prompt)
                        .media(new Media(MimeType.valueOf(contentType), new ByteArrayResource(image)))
                        .build(),
                "image %d bytes, %s".formatted(image.length, contentType));
    }

    /** Same as {@link #recognize(byte[], String)} for a meal the user described in words. */
    public PhotoRecognitionResponse recognizeText(String description) {
        requireAvailable();
        String text = description == null ? "" : description.strip();
        if (text.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty description");
        }
        if (text.length() > MAX_DESCRIPTION) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description is too long");
        }
        return recognize(
                TEXT_INTRO,
                prompt -> new UserMessage(prompt + "\nОписание пользователя:\n" + text),
                "text %d chars".formatted(text.length()));
    }

    private void requireAvailable() {
        if (!available()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Photo recognition is not configured");
        }
    }

    private PhotoRecognitionResponse recognize(String intro, Function<String, UserMessage> message, String input) {
        Long userId = CurrentUser.USER.isBound() ? CurrentUser.USER.get().getId() : null;
        Map<String, Product> index = nutritionService.productIndex();
        String prompt = buildPrompt(intro, index);
        long started = System.nanoTime();
        String answer;
        try {
            var result = chatModel.getObject().call(new Prompt(message.apply(prompt))).getResult();
            answer = result == null || result.getOutput() == null ? null : result.getOutput().getText();
        } catch (Exception e) {
            log.warn("Meal recognition call failed for user {} after {} ms ({}): {}",
                    userId, elapsedMs(started), input, describe(e), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Recognition failed");
        }
        if (answer == null || answer.isBlank()) {
            log.warn("Meal recognition returned an empty answer for user {} after {} ms ({})",
                    userId, elapsedMs(started), input);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty recognition answer");
        }
        LlmAnswer parsed;
        try {
            parsed = parse(answer);
        } catch (ResponseStatusException e) {
            log.warn("Meal recognition answer rejected for user {} after {} ms: {} (cause: {}). Answer ({} chars): {}",
                    userId, elapsedMs(started), e.getReason(), describe(e.getCause()), answer.length(), truncate(answer));
            throw e;
        }
        PhotoRecognitionResponse response = toResponse(parsed, index);
        long matched = response.items().stream().filter(i -> i.productName() != null).count();
        log.info("Meal recognized for user {} in {} ms ({}): {} items, {} matched to products, "
                        + "prompt {} chars, answer {} chars",
                userId, elapsedMs(started), input, response.items().size(), matched,
                prompt.length(), answer.length());
        return response;
    }

    private String buildPrompt(String intro, Map<String, Product> index) {
        String products = index.values().stream()
                .map(Product::getName)
                .distinct()
                .sorted()
                .collect(Collectors.joining("; "));
        return intro + """
                 Ответь СТРОГО одним JSON без пояснений.
                Схема: {"dishName":"короткое название блюда по-русски","items":[{"name":"название по-русски",
                "productName":"название из списка или null","grams":масса порции в граммах,
                "productGrams":масса в состоянии продукта из списка}]}
                Правила:
                - productName ТОЛЬКО из списка (дословно), иначе null: %s
                - grams — масса в том виде, как её едят (готовое блюдо)
                - productGrams — та же порция в состоянии продукта из списка: крупы, макароны и бобовые
                  в сухом виде (варёные примерно в 2,5–3 раза тяжелее сухих), мясо, рыба и птица в сыром виде
                  (готовые примерно на 25%% легче сырых); для остальных productGrams = grams
                - масло, соусы и заправки указывай отдельно, если они заметны или упомянуты
                - не более %d позиций; если еды нет — {"dishName":null,"items":[]}
                """
                .formatted(products, MAX_ITEMS);
    }

    private LlmAnswer parse(String answer) {
        int start = answer.indexOf('{');
        int end = answer.lastIndexOf('}');
        if (start < 0 || end <= start) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Recognition answer is not JSON");
        }
        try {
            return objectMapper.readValue(answer.substring(start, end + 1), LlmAnswer.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cannot parse recognition answer", e);
        }
    }

    private PhotoRecognitionResponse toResponse(LlmAnswer answer, Map<String, Product> index) {
        List<RecognizedItem> result = new ArrayList<>();
        NutritionFacts total = NutritionFacts.ZERO;
        for (LlmItem item : answer.items() == null ? List.<LlmItem>of() : answer.items()) {
            if (result.size() == MAX_ITEMS) {
                break;
            }
            if (item.name() == null || item.name().isBlank() || item.grams() == null || !(item.grams() > 0)) {
                continue;
            }
            double grams = Math.min(Math.round(item.grams()), MAX_GRAMS);
            Product product = resolve(item, index);
            NutritionFacts facts = null;
            Double productGrams = null;
            if (product != null) {
                // Products are stored dry/raw, so КБЖУ comes from the dry/raw equivalent of the portion.
                productGrams = item.productGrams() != null && item.productGrams() > 0
                        ? (double) Math.min(Math.round(item.productGrams()), MAX_GRAMS)
                        : grams;
                double ratio = productGrams / 100.0;
                facts = new NutritionFacts(
                        product.getKcalPer100g() * ratio,
                        product.getProteinPer100g() * ratio,
                        product.getFatPer100g() * ratio,
                        product.getCarbsPer100g() * ratio);
                total = total.add(facts);
            }
            result.add(new RecognizedItem(
                    item.name().strip(), product == null ? null : product.getName(), grams, productGrams, facts));
        }
        String dishName = answer.dishName() == null || answer.dishName().isBlank() ? null : answer.dishName().strip();
        return new PhotoRecognitionResponse(dishName, result, total);
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
    private record LlmAnswer(String dishName, List<LlmItem> items) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record LlmItem(String name, String productName, Double grams, Double productGrams) {}
}
