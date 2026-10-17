package dev.matswuuu.hse.plan.gen;

public record PlannedIngredient(String productName, double grams) {

    public PlannedIngredient scaled(double factor) {
        return new PlannedIngredient(productName, Math.round(grams * factor * 10.0) / 10.0);
    }
}
