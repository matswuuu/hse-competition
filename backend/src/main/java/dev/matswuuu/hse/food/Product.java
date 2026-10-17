package dev.matswuuu.hse.food;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Product with macros per 100 g (§4.4). Source: see NutritionProperties + /api/products/source. */
@Entity
@Table(name = "products")
@Getter
@Setter
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(name = "kcal_per_100g", nullable = false)
    private double kcalPer100g;

    @Column(name = "protein_per_100g", nullable = false)
    private double proteinPer100g;

    @Column(name = "fat_per_100g", nullable = false)
    private double fatPer100g;

    @Column(name = "carbs_per_100g", nullable = false)
    private double carbsPer100g;

    protected Product() {}

    public Product(String name, String category, double kcal, double protein, double fat, double carbs) {
        this.name = name;
        this.category = category;
        this.kcalPer100g = kcal;
        this.proteinPer100g = protein;
        this.fatPer100g = fat;
        this.carbsPer100g = carbs;
    }
}
