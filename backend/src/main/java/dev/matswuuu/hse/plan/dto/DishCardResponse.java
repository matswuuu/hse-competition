package dev.matswuuu.hse.plan.dto;

import dev.matswuuu.hse.plan.MealType;
import java.util.List;

public record DishCardResponse(
        Long mealId,
        Long dayId,
        MealType mealType,
        String dishName,
        int cookingTimeMin,
        boolean eaten,
        boolean custom,
        NutritionFacts facts,
        List<IngredientResponse> ingredients,
        List<String> steps,
        List<String> recipeUrls) {

    /** {@code category} and {@code facts} are null for a food not in the product DB (own meals only). */
    public record IngredientResponse(String productName, String category, double grams, NutritionFacts facts) {}
}
