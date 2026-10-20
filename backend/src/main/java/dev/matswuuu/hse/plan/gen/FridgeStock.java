package dev.matswuuu.hse.plan.gen;

/**
 * Fridge product the menu should use up: catalog name, grams left and days until it expires,
 * counted from the plan's first day (0 = expires on day 1).
 */
public record FridgeStock(String productName, double grams, int expiresInDays) {}
