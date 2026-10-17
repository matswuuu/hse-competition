package dev.matswuuu.hse.plan;

import dev.matswuuu.hse.food.Product;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** One ingredient with grams. КБЖУ is always computed from the product DB (§4.3). */
@Entity
@Table(name = "meal_ingredients")
@Getter
@Setter
public class MealIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meal_id", nullable = false)
    private MealEntry meal;

    /** Ingredient label as given by the planner (LLM or demo). */
    @Column(name = "product_name", nullable = false)
    private String productName;

    /** Resolved product from the DB; null when no match found. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false)
    private double grams;

    protected MealIngredient() {}
}
