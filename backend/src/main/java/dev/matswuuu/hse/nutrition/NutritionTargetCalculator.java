package dev.matswuuu.hse.nutrition;

import dev.matswuuu.hse.questionnaire.ActivityLevel;
import dev.matswuuu.hse.questionnaire.Goal;
import dev.matswuuu.hse.questionnaire.Sex;
import org.springframework.stereotype.Service;

/**
 * Calorie/macro target calculation (§4.2). Pure code, no AI.
 * Mifflin–St Jeor BMR × activity coefficient, corrected for the goal,
 * clamped to the safe minimum. Macros are per-kg-of-weight targets.
 */
@Service
public class NutritionTargetCalculator {

    private final NutritionProperties properties;

    public NutritionTargetCalculator(NutritionProperties properties) {
        this.properties = properties;
    }

    public DayTargets calculate(
            Sex sex, int age, double heightCm, double weightKg, ActivityLevel activity, Goal goal) {
        double bmr = bmr(sex, weightKg, heightCm, age);
        double norm = bmr * coefficient(activity);
        double kcal = norm * (1 + properties.getGoalAdjustmentPct().get(goal) / 100.0);
        kcal = Math.max(kcal, properties.getMinCalories().get(sex));

        double protein = properties.getProteinGPerKg().get(goal) * weightKg;
        double fat = properties.getFatGPerKg().get(goal) * weightKg;
        double restCarbs = properties.getCarbsGPerKg().get(goal) * weightKg;
        double trainingCarbs = restCarbs + properties.getTrainingDayCarbsExtraGPerKg() * weightKg;

        return new DayTargets(
                new NutritionTarget(round(kcal), round1(protein), round1(fat), round1(trainingCarbs)),
                new NutritionTarget(round(kcal), round1(protein), round1(fat), round1(restCarbs)));
    }

    private static double bmr(Sex sex, double weightKg, double heightCm, int age) {
        double base = 10 * weightKg + 6.25 * heightCm - 5 * age;
        return sex == Sex.MALE ? base + 5 : base - 161;
    }

    private double coefficient(ActivityLevel activity) {
        return properties.getActivityCoefficients().get(activity);
    }

    private static double round(double value) {
        return Math.round(value);
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
