package dev.matswuuu.hse.plan.dto;

import dev.matswuuu.hse.plan.MealType;

public record MealSummaryResponse(
        Long id, MealType mealType, String dishName, int cookingTimeMin, boolean eaten, boolean custom, NutritionFacts facts) {}
