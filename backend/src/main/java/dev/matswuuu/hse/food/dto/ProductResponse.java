package dev.matswuuu.hse.food.dto;

import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.food.ProductSource;

/** Macros are per 100 g. */
public record ProductResponse(
        Long id, String name, String category, double kcalPer100g, double proteinPer100g, double fatPer100g,
        double carbsPer100g, String barcode, ProductSource source) {

    public static ProductResponse from(Product p) {
        return new ProductResponse(
                p.getId(), p.getName(), p.getCategory(), p.getKcalPer100g(), p.getProteinPer100g(),
                p.getFatPer100g(), p.getCarbsPer100g(), p.getBarcode(), p.getSource());
    }
}
