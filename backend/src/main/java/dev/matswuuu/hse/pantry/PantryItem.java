package dev.matswuuu.hse.pantry;

import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/** A product the user already has at home ("холодильник"). */
@Entity
@Table(name = "pantry_items")
@Getter
@Setter
public class PantryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 50)
    private String category;

    /** The product as chosen or scanned (any source); null for a free-text item. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id")
    private Product product;

    /**
     * Catalog equivalent used to net the shopping list and to plan menus; null when the item
     * matches nothing in the catalog (it is then only listed).
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "catalog_product_id")
    private Product catalogProduct;

    /** Amount left, grams (millilitres count as grams). */
    @Column(nullable = false)
    private double grams;

    /** Best-before date; null when unknown. */
    @Column(name = "expires_at")
    private LocalDate expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PantrySource source;

    @CreationTimestamp
    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt;

    protected PantryItem() {}

    public PantryItem(User user, String name, String category, PantrySource source) {
        this.user = user;
        this.name = name;
        this.category = category;
        this.source = source;
    }
}
