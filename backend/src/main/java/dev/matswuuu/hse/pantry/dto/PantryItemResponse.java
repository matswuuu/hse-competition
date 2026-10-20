package dev.matswuuu.hse.pantry.dto;

import dev.matswuuu.hse.pantry.PantryItem;
import dev.matswuuu.hse.pantry.PantrySource;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** {@code daysLeft} is negative once expired, null without a date. */
public record PantryItemResponse(
        Long id, String name, String category, Long productId, String catalogProductName, double grams,
        LocalDate expiresAt, Long daysLeft, PantrySource source) {

    public static PantryItemResponse from(PantryItem item, LocalDate today) {
        return new PantryItemResponse(
                item.getId(),
                item.getName(),
                item.getCategory(),
                item.getProduct() == null ? null : item.getProduct().getId(),
                item.getCatalogProduct() == null ? null : item.getCatalogProduct().getName(),
                Math.round(item.getGrams() * 10.0) / 10.0,
                item.getExpiresAt(),
                item.getExpiresAt() == null ? null : ChronoUnit.DAYS.between(today, item.getExpiresAt()),
                item.getSource());
    }
}
