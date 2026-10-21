package dev.matswuuu.hse.photo.dto;

import dev.matswuuu.hse.plan.dto.NutritionFacts;

/**
 * One food found on the photo or in the description. {@code productName}, {@code productGrams} and {@code facts}
 * are null when it matches no product in the DB: its КБЖУ is then unknown, not guessed. {@code grams} is the
 * portion as eaten, {@code productGrams} the same portion in the product's dry/raw state the КБЖУ is computed from.
 */
public record RecognizedItem(String name, String productName, double grams, Double productGrams, NutritionFacts facts) {}
