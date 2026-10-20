package dev.matswuuu.hse.purchase.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/** An expense typed in by hand; {@code date} defaults to today, {@code category} is guessed from the name. */
public record ManualPurchaseRequest(
        @NotBlank @Size(max = 255) String name,
        @NotNull @DecimalMin("0.01") @DecimalMax("10000000") BigDecimal price,
        @Size(max = 50) String category,
        @PastOrPresent LocalDate date) {}
