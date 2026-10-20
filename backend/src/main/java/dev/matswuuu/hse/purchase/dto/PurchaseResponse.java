package dev.matswuuu.hse.purchase.dto;

import dev.matswuuu.hse.purchase.Purchase;
import dev.matswuuu.hse.purchase.PurchaseItem;
import dev.matswuuu.hse.purchase.PurchaseSource;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PurchaseResponse(
        Long id, LocalDateTime purchasedAt, String store, BigDecimal total, PurchaseSource source, List<Item> items) {

    /** {@code productId} is the matched catalog product, if any (prefills adding to the fridge). */
    public record Item(
            Long id, String name, String category, Long productId, String productName, BigDecimal price,
            double quantity, BigDecimal sum, Double grams, boolean food) {

        static Item from(PurchaseItem i) {
            return new Item(
                    i.getId(), i.getName(), i.getCategory(),
                    i.getProduct() == null ? null : i.getProduct().getId(),
                    i.getProduct() == null ? null : i.getProduct().getName(),
                    i.getPrice(), i.getQuantity(), i.getSum(), i.getGrams(), i.isFood());
        }
    }

    public static PurchaseResponse from(Purchase p) {
        return new PurchaseResponse(
                p.getId(), p.getPurchasedAt(), p.getStore(), p.getTotal(), p.getSource(),
                p.getItems().stream().map(Item::from).toList());
    }
}
