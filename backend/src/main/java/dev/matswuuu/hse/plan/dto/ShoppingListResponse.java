package dev.matswuuu.hse.plan.dto;

import java.util.List;

public record ShoppingListResponse(List<CategoryGroup> categories) {

    public record CategoryGroup(String category, List<Item> items) {}

    public record Item(String productName, double grams) {}
}
