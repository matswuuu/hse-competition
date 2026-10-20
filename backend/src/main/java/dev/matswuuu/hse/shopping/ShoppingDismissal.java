package dev.matswuuu.hse.shopping;

import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.plan.MealPlan;
import jakarta.persistence.*;
import lombok.Getter;

/** A product the user removed from a plan's shopping list ("не покупать"). */
@Entity
@Table(name = "shopping_dismissals", uniqueConstraints = @UniqueConstraint(columnNames = {"plan_id", "product_id"}))
@Getter
public class ShoppingDismissal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private MealPlan plan;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    protected ShoppingDismissal() {}

    public ShoppingDismissal(MealPlan plan, Product product) {
        this.plan = plan;
        this.product = product;
    }
}
