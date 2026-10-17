package dev.matswuuu.hse.plan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** One day of a meal plan with its calorie/macro goal (§4.5: day total vs target). */
@Entity
@Table(name = "plan_days")
@Getter
@Setter
public class PlanDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private MealPlan plan;

    @Column(name = "day_index", nullable = false)
    private int dayIndex;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "training_day", nullable = false)
    private boolean trainingDay;

    @Column(name = "target_kcal", nullable = false)
    private double targetKcal;

    @Column(name = "target_protein_g", nullable = false)
    private double targetProteinG;

    @Column(name = "target_fat_g", nullable = false)
    private double targetFatG;

    @Column(name = "target_carbs_g", nullable = false)
    private double targetCarbsG;

    protected PlanDay() {}
}
