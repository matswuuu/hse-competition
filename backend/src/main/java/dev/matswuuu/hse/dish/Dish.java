package dev.matswuuu.hse.dish;

import dev.matswuuu.hse.plan.MealType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/** Template dish for the code-only planner; grams are portions before fitting. Seeded from meals.yaml. */
@Entity
@Table(name = "dishes")
@Getter
@Setter
public class Dish {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "cooking_time_min", nullable = false)
    private int cookingTimeMin;

    @ElementCollection
    @CollectionTable(name = "dish_slots", joinColumns = @JoinColumn(name = "dish_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false, length = 20)
    @BatchSize(size = 100)
    private Set<MealType> slots = EnumSet.noneOf(MealType.class);

    @ElementCollection
    @CollectionTable(name = "dish_ingredients", joinColumns = @JoinColumn(name = "dish_id"))
    @OrderColumn(name = "idx")
    @BatchSize(size = 100)
    private List<DishIngredient> ingredients = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "dish_steps", joinColumns = @JoinColumn(name = "dish_id"))
    @OrderColumn(name = "idx")
    @Column(name = "step", nullable = false, length = 1000)
    @BatchSize(size = 100)
    private List<String> steps = new ArrayList<>();

    /** External pages with a fuller recipe of this or a close dish. */
    @ElementCollection
    @CollectionTable(name = "dish_recipe_urls", joinColumns = @JoinColumn(name = "dish_id"))
    @Column(name = "url", nullable = false, length = 2048)
    @BatchSize(size = 100)
    private Set<String> recipeUrls = new LinkedHashSet<>();

    protected Dish() {}

    public Dish(String name, Set<MealType> slots, int cookingTimeMin,
                List<DishIngredient> ingredients, List<String> steps, Set<String> recipeUrls) {
        this.name = name;
        this.slots = EnumSet.copyOf(slots);
        this.cookingTimeMin = cookingTimeMin;
        this.ingredients = new ArrayList<>(ingredients);
        this.steps = new ArrayList<>(steps);
        this.recipeUrls = new LinkedHashSet<>(recipeUrls);
    }
}
