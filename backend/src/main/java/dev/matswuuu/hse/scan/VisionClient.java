package dev.matswuuu.hse.scan;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.content.Media;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeType;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static dev.matswuuu.hse.common.LogText.*;

/**
 * Gemini (LLM profile) as a reader of photos and text that answers with one JSON object.
 * Every failure collapses to {@code null}, so callers can fall back to asking the user.
 */
@Component
public class VisionClient {

    private static final Logger log = LoggerFactory.getLogger(VisionClient.class);

    private final ObjectProvider<ChatModel> chatModel;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    public VisionClient(
            ObjectProvider<ChatModel> chatModel,
            ObjectMapper objectMapper,
            @Value("${nutrition.llm.enabled:false}") boolean enabled) {
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
    }

    public boolean available() {
        return enabled && chatModel.getIfAvailable() != null;
    }

    /** JSON object from the model's answer about the image (or text only when {@code image} is null). */
    public JsonNode askJson(String purpose, String prompt, byte[] image, String contentType) {
        if (!available()) {
            return null;
        }
        long started = System.nanoTime();
        String answer;
        try {
            var builder = UserMessage.builder().text(prompt);
            if (image != null) {
                builder.media(new Media(MimeType.valueOf(contentType), new ByteArrayResource(image)));
            }
            var result = chatModel.getObject().call(new Prompt(builder.build())).getResult();
            answer = result == null || result.getOutput() == null ? null : result.getOutput().getText();
        } catch (Exception e) {
            log.warn("Vision call '{}' failed after {} ms: {}", purpose, elapsedMs(started), describe(e), e);
            return null;
        }
        if (answer == null) {
            log.warn("Vision call '{}' returned no answer after {} ms", purpose, elapsedMs(started));
            return null;
        }
        int start = answer.indexOf('{');
        int end = answer.lastIndexOf('}');
        if (start < 0 || end <= start) {
            log.warn("Vision call '{}' answer is not JSON: {}", purpose, truncate(answer));
            return null;
        }
        try {
            JsonNode json = objectMapper.readTree(answer.substring(start, end + 1));
            log.info("Vision call '{}' answered in {} ms", purpose, elapsedMs(started));
            return json;
        } catch (Exception e) {
            log.warn("Vision call '{}' answer cannot be parsed ({}): {}", purpose, describe(e), truncate(answer));
            return null;
        }
    }

    /** Text field or null for missing/blank/"null". */
    public static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (!value.isString()) {
            return null;
        }
        String text = value.asString("").strip();
        return text.isEmpty() || text.equalsIgnoreCase("null") ? null : text;
    }

    /** Non-negative number or null. */
    public static Double number(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isNumber()) {
            double d = value.asDouble(0);
            return d >= 0 ? d : null;
        }
        if (value.isString()) {
            try {
                double d = Double.parseDouble(value.asString("").replace(',', '.').strip());
                return d >= 0 ? d : null;
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
