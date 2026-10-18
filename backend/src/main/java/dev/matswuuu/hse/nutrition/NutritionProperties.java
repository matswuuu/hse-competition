package dev.matswuuu.hse.nutrition;

import dev.matswuuu.hse.questionnaire.ActivityLevel;
import dev.matswuuu.hse.questionnaire.Goal;
import dev.matswuuu.hse.questionnaire.Sex;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * All nutrition math parameters live here, not in code (§4.2 of the spec).
 * Values are defaults based on sports recommendations (ISSN, ACSM)
 * and must be approved by Matvey; override via application.yaml.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "nutrition")
public class NutritionProperties {

    /** BMR multiplier per activity level. */
    private Map<ActivityLevel, Double> activityCoefficients = Map.of(
            ActivityLevel.SEDENTARY, 1.2,
            ActivityLevel.LIGHT, 1.375,
            ActivityLevel.MODERATE, 1.55,
            ActivityLevel.ACTIVE, 1.725,
            ActivityLevel.VERY_ACTIVE, 1.9);

    /** Goal correction, percent of the daily norm (e.g. 10 = +10%). */
    private Map<Goal, Double> goalAdjustmentPct = Map.of(
            Goal.GAIN, 10.0, Goal.MAINTAIN, 0.0, Goal.LOSE, -15.0);

    /** Target protein grams per kg of body weight, per goal. */
    private Map<Goal, Double> proteinGPerKg = Map.of(
            Goal.GAIN, 2.0, Goal.MAINTAIN, 1.8, Goal.LOSE, 2.2);

    /** Target fat grams per kg of body weight, per goal. */
    private Map<Goal, Double> fatGPerKg = Map.of(
            Goal.GAIN, 1.0, Goal.MAINTAIN, 1.0, Goal.LOSE, 0.9);

    /**
     * Carbs fill the calories left after protein and fat, but never drop below this
     * (g per kg); fat gives way first, down to {@link #minFatGPerKg}.
     */
    private double minCarbsGPerKg = 2.0;

    /** Lowest fat (g per kg) when calories are too tight for protein + fat + minimum carbs. */
    private double minFatGPerKg = 0.6;

    /** Extra carbs (g per kg) on training days. */
    private double trainingDayCarbsExtraGPerKg = 1.0;

    /** Never issue a calorie target below this floor. */
    private Map<Sex, Double> minCalories = Map.of(Sex.MALE, 1500.0, Sex.FEMALE, 1200.0);

    /** Allowed deviation of a day's plan totals from the target, percent. */
    private double tolerancePct = 10.0;

    /** Max plan generation / portion-fitting attempts per day. */
    private int maxAttempts = 5;

    /** Product DB source attribution (shown in UI per §4.4). */
    private String sourceName = "USDA FoodData Central (open data, adapted for MVP demo)";

    private String sourceUrl = "https://fdc.nal.usda.gov/";
}
