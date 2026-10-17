package dev.matswuuu.hse.plan.gen;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.food.ProductRepository;
import dev.matswuuu.hse.plan.MealType;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * LLM dish picker (§4.3): proposes dishes as strict JSON, КБЖУ recomputed by code.
 * Active only with {@code nutrition.llm.enabled=true} and a configured model;
 * any failure falls back to the demo planner.
 */
@Service
@ConditionalOnProperty(name = "nutrition.llm.enabled", havingValue = "true")
public class LlmMealPlanner implements MealPlanner {

    private static final Logger log = LoggerFactory.getLogger(LlmMealPlanner.class);

    private final ObjectProvider<ChatModel> chatModel;
    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    public LlmMealPlanner(
            ObjectProvider<ChatModel> chatModel,
            ProductRepository productRepository,
            ObjectMapper objectMapper,
            @Value("${nutrition.llm.enabled:false}") boolean enabled) {
        this.chatModel = chatModel;
        this.productRepository = productRepository;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
    }

    @Override
    public String name() {
        return "llm";
    }

    @Override
    public boolean available() {
        return enabled && chatModel.getIfAvailable() != null;
    }

    @Override
    public List<PlannedDay> plan(PlanContext context) {
        ChatModel model = chatModel.getIfAvailable();
        if (model == null) {
            throw new PlannerException("No chat model available");
        }
        try {
            String prompt = buildPrompt(context);
            String answer = model.call(prompt);
            return parse(answer, context);
        } catch (PlannerException e) {
            throw e;
        } catch (Exception e) {
            log.warn("LLM planning failed, falling back to demo planner", e);
            throw new PlannerException("LLM planning failed: " + e.getMessage(), e);
        }
    }

    private String buildPrompt(PlanContext context) {
        var q = context.questionnaire();
        MealType[] slots = MealType.slotsFor(q.getMealsPerDay());
        String slotList = java.util.Arrays.stream(slots).map(Enum::name).collect(Collectors.joining(", "));
        String products = productRepository.findAll().stream()
                .map(Product::getName)
                .collect(Collectors.joining("; "));
        boolean[] training = context.trainingDays();
        StringBuilder days = new StringBuilder();
        for (int i = 0; i < 7; i++) {
            var target = training[i] ? context.targets().trainingDay() : context.targets().restDay();
            days.append("День %d (%s): цель %.0f ккал, белки %.0f г, жиры %.0f г, углеводы %.0f г%n"
                    .formatted(
                            i + 1,
                            training[i] ? "тренировочный" : "отдых",
                            target.kcal(),
                            target.proteinG(),
                            target.fatG(),
                            target.carbsG()));
        }
        Set<String> excluded = DemoMealPlanner.collectExclusions(q);
        return """
                Подбери блюда на 7 дней для спортивного питания. Ответь СТРОГО одним JSON без пояснений.
                Схема: {"days":[{"trainingDay":bool,"meals":[{"mealType":"%s","dishName":"название",
                "cookingTimeMin":число,"ingredients":[{"productName":"точное название продукта","grams":граммы}],
                "steps":["шаг 1","шаг 2"]}]}]}
                Приёмы пищи каждый день (строго в этом порядке): %s.
                Дневные цели:
                %s
                Правила:
                - productName ТОЛЬКО из списка (дословно): %s
                - граммы: крупы и макароны в сухом виде; мясо/рыба/птица в сыром виде
                - ЗАПРЕЩЕНЫ (не использовать нигде): %s
                - время готовки блюда не более %d минут
                - без спортпита и БАДов, только обычная еда
                - калорийность дня примерно равна цели (±10%% за счёт граммовок)
                """
                .formatted(
                        "BREAKFAST|LUNCH|DINNER|SNACK|SNACK_2",
                        slotList,
                        days,
                        products,
                        excluded.isEmpty() ? "нет" : String.join(", ", excluded),
                        maxMinutes(q.getCookingTime()));
    }

    private static int maxMinutes(dev.matswuuu.hse.questionnaire.CookingTime cookingTime) {
        return switch (cookingTime) {
            case UP_TO_20 -> 20;
            case UP_TO_40 -> 40;
            case ANY -> 120;
        };
    }

    private List<PlannedDay> parse(String answer, PlanContext context) {
        String json = answer.strip();
        int start = json.indexOf('{');
        int end = json.lastIndexOf('}');
        if (start < 0 || end <= start) {
            throw new PlannerException("LLM answer is not JSON");
        }
        try {
            LlmPlan plan = objectMapper.readValue(json.substring(start, end + 1), LlmPlan.class);
            if (plan.days() == null || plan.days().size() != 7) {
                throw new PlannerException("LLM plan must contain exactly 7 days");
            }
            MealType[] slots = MealType.slotsFor(context.questionnaire().getMealsPerDay());
            boolean[] training = context.trainingDays();
            List<PlannedDay> days = new ArrayList<>(7);
            for (int i = 0; i < 7; i++) {
                LlmDay day = plan.days().get(i);
                if (day.meals() == null || day.meals().size() != slots.length) {
                    throw new PlannerException("Day %d must contain %d meals".formatted(i + 1, slots.length));
                }
                List<PlannedMeal> meals = new ArrayList<>(slots.length);
                for (int m = 0; m < slots.length; m++) {
                    LlmMeal meal = day.meals().get(m);
                    if (meal.mealType() != slots[m]
                            || meal.dishName() == null
                            || meal.dishName().isBlank()
                            || meal.ingredients() == null
                            || meal.ingredients().isEmpty()) {
                        throw new PlannerException("Invalid meal at day %d slot %d".formatted(i + 1, m + 1));
                    }
                    meals.add(new PlannedMeal(
                            meal.mealType(),
                            meal.dishName().strip(),
                            Math.max(5, meal.cookingTimeMin()),
                            meal.ingredients().stream()
                                    .map(in -> new PlannedIngredient(
                                            in.productName().strip(), Math.max(1, in.grams())))
                                    .toList(),
                            meal.steps() == null ? List.of() : meal.steps()));
                }
                days.add(new PlannedDay(training[i], meals));
            }
            return days;
        } catch (PlannerException e) {
            throw e;
        } catch (Exception e) {
            throw new PlannerException("Cannot parse LLM answer: " + e.getMessage(), e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record LlmPlan(List<LlmDay> days) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record LlmDay(boolean trainingDay, List<LlmMeal> meals) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record LlmMeal(
            MealType mealType, String dishName, int cookingTimeMin, List<LlmIngredient> ingredients,
            List<String> steps) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record LlmIngredient(String productName, double grams) {}
}
