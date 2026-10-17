package dev.matswuuu.hse.plan.gen;

import dev.matswuuu.hse.plan.MealType;
import java.util.List;

/** One planned meal from a planner (LLM or demo). КБЖУ is recomputed by code. */
public record PlannedMeal(
        MealType mealType, String dishName, int cookingTimeMin, List<PlannedIngredient> ingredients, List<String> steps) {

    public PlannedMeal scaled(double factor) {
        return new PlannedMeal(
                mealType,
                dishName,
                cookingTimeMin,
                ingredients.stream().map(i -> i.scaled(factor)).toList(),
                steps);
    }
}
