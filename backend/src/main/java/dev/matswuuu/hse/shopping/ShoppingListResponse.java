package dev.matswuuu.hse.shopping;

import java.util.List;

/**
 * What to buy for the rest of the plan. Per product: grams the remaining (not eaten) meals need,
 * grams already in the fridge and the difference to buy; {@code toBuyGrams} 0 means covered.
 */
public record ShoppingListResponse(List<CategoryGroup> categories, List<DismissedItem> dismissed) {

    public record CategoryGroup(String category, List<Item> items) {}

    public record Item(Long productId, String productName, double neededGrams, double inFridgeGrams, double toBuyGrams) {}

    /** Removed by the user from this plan's list; can be restored. */
    public record DismissedItem(Long productId, String productName) {}
}
