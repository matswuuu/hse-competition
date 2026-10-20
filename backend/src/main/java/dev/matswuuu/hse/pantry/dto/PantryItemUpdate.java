package dev.matswuuu.hse.pantry.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;

/** Full replacement of the editable fields; a null {@code expiresAt} clears the date. */
public record PantryItemUpdate(@NotNull @Positive @Max(100_000) Double grams, LocalDate expiresAt) {}
