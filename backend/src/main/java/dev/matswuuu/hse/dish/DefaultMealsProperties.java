package dev.matswuuu.hse.dish;

import dev.matswuuu.hse.plan.MealType;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Default dishes from meals.yaml, seeded into the dishes table by {@link DishSeeder}. */
@ConfigurationProperties(prefix = "meals")
public record DefaultMealsProperties(List<DefaultMeal> defaults) {

    public DefaultMealsProperties {
        defaults = defaults == null ? List.of() : List.copyOf(defaults);
    }

    public record DefaultMeal(
            String name,
            Set<MealType> slots,
            int cookingTimeMin,
            List<Ingredient> ingredients,
            List<String> steps,
            Set<String> recipeUrls) {

        public DefaultMeal {
            steps = steps == null ? List.of() : List.copyOf(steps);
            recipeUrls = recipeUrls == null ? Set.of() : new LinkedHashSet<>(recipeUrls);
        }
    }

    public record Ingredient(String product, double grams) {}
}
