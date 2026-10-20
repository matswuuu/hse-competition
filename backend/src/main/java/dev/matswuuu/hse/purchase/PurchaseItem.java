package dev.matswuuu.hse.purchase;

import dev.matswuuu.hse.food.Product;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "purchase_items")
@Getter
@Setter
public class PurchaseItem {

    /** Category for receipt lines that are not food (bags, household goods). */
    public static final String NON_FOOD = "непродовольственные";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_id", nullable = false)
    private Purchase purchase;

    /** As printed on the receipt. */
    @Column(nullable = false, length = 500)
    private String name;

    /** Spending category: catalog category, "прочее" for unknown food, {@link #NON_FOOD}. */
    @Column(nullable = false, length = 50)
    private String category;

    /** Matched product (catalog or the one added to the fridge), null when unknown. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private double quantity;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal sum;

    /** Total weight/volume when it can be read from the line ("1КГ", "930МЛ", weighed goods). */
    private Double grams;

    protected PurchaseItem() {}

    public PurchaseItem(Purchase purchase, String name, String category) {
        this.purchase = purchase;
        this.name = name;
        this.category = category;
    }

    public boolean isFood() {
        return !NON_FOOD.equals(category);
    }
}
