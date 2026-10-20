package dev.matswuuu.hse.pantry.dto;

import dev.matswuuu.hse.pantry.PantrySource;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * New fridge item: a known product ({@code productId}) or a free-text {@code name}.
 * {@code price}, when given, is recorded as a purchase for spending analytics.
 */
public record PantryItemRequest(
        Long productId,
        @Size(max = 255) String name,
        @NotNull @Positive @Max(100_000) Double grams,
        LocalDate expiresAt,
        @DecimalMin("0.0") BigDecimal price,
        PantrySource source) {}
