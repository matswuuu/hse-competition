package dev.matswuuu.hse.plan;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** One meal: dish card with recipe, grams, cooking time (§4.6). */
@Entity
@Table(name = "meal_entries")
@Getter
@Setter
public class MealEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_day_id", nullable = false)
    private PlanDay planDay;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false, length = 10)
    private MealType mealType;

    /** Order within the day (follows the slot order for 3–5 meals). */
    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private String dishName;

    @Column(name = "cooking_time_min", nullable = false)
    private int cookingTimeMin;

    /** Marked when the user ate it (§4.5). */
    @Column(nullable = false)
    private boolean eaten;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "meal_steps", joinColumns = @JoinColumn(name = "meal_id"))
    @OrderColumn(name = "step_index")
    @Column(name = "step", length = 1000)
    private List<String> steps = new ArrayList<>();

    protected MealEntry() {}
}
