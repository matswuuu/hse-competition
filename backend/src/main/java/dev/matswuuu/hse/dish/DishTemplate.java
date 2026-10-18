package dev.matswuuu.hse.dish;

import dev.matswuuu.hse.plan.MealType;
import dev.matswuuu.hse.plan.gen.PlannedIngredient;
import dev.matswuuu.hse.plan.gen.PlannedMeal;
import java.util.List;
import java.util.Set;

/** Immutable snapshot of a {@link Dish}, safe to use outside a transaction. */
public record DishTemplate(
        String dishName, Set<MealType> slots, int minutes,
        List<PlannedIngredient> ingredients,
        List<String> steps) {

    public PlannedMeal toMeal(MealType slot) {
        return new PlannedMeal(slot, dishName, minutes, ingredients, steps);
    }
}
