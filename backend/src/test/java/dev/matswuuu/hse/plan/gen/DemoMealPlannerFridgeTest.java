package dev.matswuuu.hse.plan.gen;

import dev.matswuuu.hse.dish.DishCatalog;
import dev.matswuuu.hse.dish.DishTemplate;
import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.food.ProductRepository;
import dev.matswuuu.hse.food.ProductSource;
import dev.matswuuu.hse.nutrition.DayTargets;
import dev.matswuuu.hse.nutrition.NutritionProperties;
import dev.matswuuu.hse.nutrition.NutritionTarget;
import dev.matswuuu.hse.plan.MealType;
import dev.matswuuu.hse.plan.PlanNutritionService;
import dev.matswuuu.hse.questionnaire.CookingTime;
import dev.matswuuu.hse.questionnaire.Questionnaire;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DemoMealPlannerFridgeTest {

    private static final Set<MealType> ALL = Set.of(MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER);

    private final DemoMealPlanner planner = planner();
    private final Questionnaire questionnaire = Questionnaire.builder()
            .mealsPerDay(3).cookingTime(CookingTime.ANY).trainingsPerWeek(0).build();
    private final DayTargets targets = new DayTargets(
            new NutritionTarget(2200, 130, 70, 260), new NutritionTarget(2200, 130, 70, 260));

    @Test
    void withoutFridgeTheTurkeyDishIsNotFirst() {
        List<PlannedDay> days = planner.plan(context(List.of()));
        assertThat(days.getFirst().meals().getFirst().dishName()).isNotEqualTo("Индейка с рисом");
    }

    @Test
    void expiringProductComesFirstWhileInStock() {
        // 300 g of turkey expiring on day 2: enough for two 150 g portions.
        List<PlannedDay> days = planner.plan(context(List.of(new FridgeStock("Индейка (филе)", 300, 1))));

        assertThat(days.getFirst().meals().getFirst().dishName()).isEqualTo("Индейка с рисом");
        assertThat(days.get(1).meals().getFirst().dishName()).isEqualTo("Индейка с рисом");
    }

    @Test
    void usedUpProductStopsPullingTheDish() {
        // One portion only: day 1 uses it, day 2 starts like a plan without the fridge would.
        List<PlannedDay> withOnePortion = planner.plan(context(List.of(new FridgeStock("Индейка (филе)", 150, 5))));
        List<PlannedDay> withPlenty = planner.plan(context(List.of(new FridgeStock("Индейка (филе)", 5000, 5))));

        assertThat(withOnePortion.getFirst().meals().getFirst().dishName()).isEqualTo("Индейка с рисом");
        assertThat(withPlenty.get(1).meals().getFirst().dishName()).isEqualTo("Индейка с рисом");
        assertThat(withOnePortion.get(1).meals().getFirst().dishName()).isNotEqualTo("Индейка с рисом");
    }

    private PlanContext context(List<FridgeStock> fridge) {
        return new PlanContext(questionnaire, targets, LocalDate.of(2026, 10, 19), 0, Set.of(),
                Instant.now().plusSeconds(60), fridge);
    }

    private static DemoMealPlanner planner() {
        ProductRepository products = mock(ProductRepository.class);
        when(products.findBySource(ProductSource.CATALOG)).thenReturn(List.of(
                new Product("Индейка (филе)", "птица", 120, 24, 1.5, 0),
                new Product("Куриная грудка (филе)", "птица", 110, 23.1, 1.2, 0),
                new Product("Рис белый (сухой)", "крупы", 344, 6.7, 0.7, 78),
                new Product("Гречка (сухая)", "крупы", 330, 12.6, 3.3, 62),
                new Product("Овсянка (сухая)", "крупы", 350, 12, 6, 65),
                new Product("Масло оливковое", "масла", 898, 0, 99.8, 0)));
        DishCatalog catalog = mock(DishCatalog.class);
        when(catalog.templates()).thenReturn(List.of(
                dish("Курица с гречкой", "Куриная грудка (филе)", "Гречка (сухая)"),
                dish("Овсянка с маслом", "Овсянка (сухая)", "Овсянка (сухая)"),
                dish("Курица с рисом", "Куриная грудка (филе)", "Рис белый (сухой)"),
                dish("Гречка с курицей", "Гречка (сухая)", "Куриная грудка (филе)"),
                dish("Индейка с рисом", "Индейка (филе)", "Рис белый (сухой)")));
        return new DemoMealPlanner(new PlanNutritionService(products), new NutritionProperties(), catalog);
    }

    private static DishTemplate dish(String name, String protein, String carbs) {
        return new DishTemplate(name, ALL, 20,
                List.of(new PlannedIngredient(protein, 150), new PlannedIngredient(carbs, 80),
                        new PlannedIngredient("Масло оливковое", 10)),
                List.of("Приготовить"));
    }
}
