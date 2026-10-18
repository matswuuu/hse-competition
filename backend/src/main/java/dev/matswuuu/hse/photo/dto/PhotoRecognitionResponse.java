package dev.matswuuu.hse.photo.dto;

import dev.matswuuu.hse.plan.dto.NutritionFacts;
import java.util.List;

/** {@code total} sums only the items matched to products. */
public record PhotoRecognitionResponse(List<RecognizedItem> items, NutritionFacts total) {}
