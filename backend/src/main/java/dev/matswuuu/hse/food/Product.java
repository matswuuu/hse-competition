package dev.matswuuu.hse.food;

import dev.matswuuu.hse.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Product with macros per 100 g (§4.4). Source: see NutritionProperties + /api/products/source.
 * Only {@link ProductSource#CATALOG} products take part in meal planning; the others come from
 * product scans (barcode lookups, user-entered labels) and are used for the fridge and purchases.
 */
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

    /** EAN/UPC of a packaged product, when known. */
    @Column(length = 32)
    private String barcode;

    // The default fills existing rows when ddl-auto adds the column.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) default 'CATALOG' not null")
    private ProductSource source = ProductSource.CATALOG;

    /** Author of a {@link ProductSource#USER} product, visible only to them; null for shared products. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

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
