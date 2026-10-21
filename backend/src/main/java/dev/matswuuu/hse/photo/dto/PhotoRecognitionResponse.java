package dev.matswuuu.hse.photo.dto;

import dev.matswuuu.hse.plan.dto.NutritionFacts;
import java.util.List;

/** {@code dishName} is the model's short name for the meal, may be null; {@code total} sums only the items matched to products. */
public record PhotoRecognitionResponse(String dishName, List<RecognizedItem> items, NutritionFacts total) {}
