package dev.matswuuu.hse.plan.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/**
 * The user's own meal, usually a reviewed recognition result. Only names and grams are taken:
 * КБЖУ is recomputed from the product DB (§4.3).
 *
 * @param eaten whether it is already eaten (logged after the fact) or only planned
 */
public record CustomMealRequest(
        @NotBlank @Size(max = 200) String dishName,
        @NotEmpty @Size(max = 12) List<@Valid Item> items,
        boolean eaten) {

    /**
     * @param productName catalog product; null when the food is not in the DB (then it is shown but not counted)
     * @param grams in the product's state (dry/raw), the same as {@code productGrams} of a recognition
     */
    public record Item(
            @NotBlank @Size(max = 200) String name,
            @Size(max = 200) String productName,
            @Positive @DecimalMax("2000") double grams) {}
}
