package dev.matswuuu.hse.photo.dto;

import dev.matswuuu.hse.plan.dto.NutritionFacts;

/**
 * One food found on the photo. {@code productName} and {@code facts} are null
 * when it matches no product in the DB: its КБЖУ is then unknown, not guessed.
 */
public record RecognizedItem(String name, String productName, double grams, NutritionFacts facts) {}
