package dev.matswuuu.hse.scan.dto;

import jakarta.validation.constraints.*;

/**
 * A product the user names after photographing its label. Macros per 100 g are read from the
 * label photo when one is sent; values given here override them.
 */
public record LabelProductRequest(
        @NotBlank @Size(max = 200) String name,
        @Pattern(regexp = "\\d{6,14}") String barcode,
        @Size(max = 50) String category,
        @DecimalMin("0") @DecimalMax("900") Double kcal,
        @DecimalMin("0") @DecimalMax("100") Double protein,
        @DecimalMin("0") @DecimalMax("100") Double fat,
        @DecimalMin("0") @DecimalMax("100") Double carbs) {}
