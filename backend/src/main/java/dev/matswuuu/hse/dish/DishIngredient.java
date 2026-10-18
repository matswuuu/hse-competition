package dev.matswuuu.hse.dish;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;

/** Ingredient label (matched against the product DB) with template grams. */
@Embeddable
@Getter
public class DishIngredient {

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(nullable = false)
    private double grams;

    protected DishIngredient() {}

    public DishIngredient(String productName, double grams) {
        this.productName = productName;
        this.grams = grams;
    }
}
