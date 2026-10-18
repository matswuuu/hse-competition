package dev.matswuuu.hse.photo;

import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.food.ProductRepository;
import dev.matswuuu.hse.photo.dto.PhotoRecognitionResponse;
import dev.matswuuu.hse.plan.PlanNutritionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.data.Offset.offset;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PhotoRecognitionServiceTest {

    private static final byte[] IMAGE = {1, 2, 3};

    @Test
    @DisplayName("КБЖУ is computed by code from the dry/raw equivalent; unknown foods stay without facts")
    void computesFactsFromProducts() {
        var service = service(true, """
                Вот результат:
                {"items":[
                  {"name":"Гречка отварная","productName":"Гречка (сухая)","grams":180,"productGrams":60},
                  {"name":"Куриная грудка","productName":null,"grams":100,"productGrams":130},
                  {"name":"Соус терияки","productName":null,"grams":20},
                  {"name":"","grams":50}
                ]}
                """);

        PhotoRecognitionResponse response = service.recognize(IMAGE, "image/jpeg");

        assertThat(response.items()).hasSize(3);
        var buckwheat = response.items().get(0);
        assertThat(buckwheat.productName()).isEqualTo("Гречка (сухая)");
        assertThat(buckwheat.grams()).isEqualTo(180);
        assertThat(buckwheat.facts().kcal()).isEqualTo(198, offset(0.01));

        // Matched by its own name when the model gave no productName.
        var chicken = response.items().get(1);
        assertThat(chicken.productName()).isEqualTo("Куриная грудка (филе)");
        assertThat(chicken.facts().kcal()).isEqualTo(143, offset(0.01));

        var sauce = response.items().get(2);
        assertThat(sauce.productName()).isNull();
        assertThat(sauce.facts()).isNull();

        assertThat(response.total().kcal()).isEqualTo(341, offset(0.01));
    }

    @Test
    @DisplayName("without a configured model the endpoint answers 503")
    void unavailable() {
        var service = service(false, "{}");
        assertThat(service.available()).isFalse();
        assertThatThrownBy(() -> service.recognize(IMAGE, "image/jpeg"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }

    @Test
    @DisplayName("non-image uploads and garbage answers are rejected")
    void rejectsBadInput() {
        assertThatThrownBy(() -> service(true, "{}").recognize(IMAGE, "application/pdf"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE));
        assertThatThrownBy(() -> service(true, "не знаю").recognize(IMAGE, "image/png"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY));
    }

    @SuppressWarnings("unchecked")
    private static PhotoRecognitionService service(boolean enabled, String answer) {
        ChatModel model = mock(ChatModel.class);
        when(model.call(any(Prompt.class)))
                .thenReturn(new ChatResponse(List.of(new Generation(new AssistantMessage(answer)))));
        ObjectProvider<ChatModel> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(model);
        when(provider.getObject()).thenReturn(model);

        ProductRepository products = mock(ProductRepository.class);
        when(products.findAll()).thenReturn(List.of(
                new Product("Гречка (сухая)", "крупы", 330, 12.6, 3.3, 62.0),
                new Product("Куриная грудка (филе)", "мясо", 110, 23.1, 1.2, 0)));

        return new PhotoRecognitionService(
                provider, new PlanNutritionService(products), JsonMapper.builder().build(), enabled);
    }
}
