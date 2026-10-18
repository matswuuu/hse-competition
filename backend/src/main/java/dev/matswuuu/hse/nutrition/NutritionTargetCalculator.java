package dev.matswuuu.hse.nutrition;

import dev.matswuuu.hse.questionnaire.ActivityLevel;
import dev.matswuuu.hse.questionnaire.Goal;
import dev.matswuuu.hse.questionnaire.Sex;
import org.springframework.stereotype.Service;

@Service
public class NutritionTargetCalculator {

    private static final double KCAL_PER_G_PROTEIN = 4;
    private static final double KCAL_PER_G_FAT = 9;
    private static final double KCAL_PER_G_CARBS = 4;

    private final NutritionProperties properties;

    public NutritionTargetCalculator(NutritionProperties properties) {
        this.properties = properties;
    }

    public DayTargets calculate(Sex sex,
                                int age,
                                double heightCm,
                                double weightKg,
                                ActivityLevel activity,
                                Goal goal) {
        double bmr = bmr(sex, weightKg, heightCm, age);
        double norm = bmr * coefficient(activity);
        double kcal = norm * (1 + properties.getGoalAdjustmentPct().get(goal) / 100.0);
        kcal = Math.max(kcal, properties.getMinCalories().get(sex));

        double protein = properties.getProteinGPerKg().get(goal) * weightKg;
        double fat = properties.getFatGPerKg().get(goal) * weightKg;
        double minCarbs = properties.getMinCarbsGPerKg() * weightKg;
        double carbs = (kcal - KCAL_PER_G_PROTEIN * protein - KCAL_PER_G_FAT * fat) / KCAL_PER_G_CARBS;
        if (carbs < minCarbs) {
            // Tight budget: trim fat first, then accept a slightly higher kcal than planned.
            carbs = minCarbs;
            double fatRoom = (kcal - KCAL_PER_G_PROTEIN * protein - KCAL_PER_G_CARBS * carbs) / KCAL_PER_G_FAT;
            fat = Math.max(fatRoom, properties.getMinFatGPerKg() * weightKg);
        }
        double extraCarbs = properties.getTrainingDayCarbsExtraGPerKg() * weightKg;

        return new DayTargets(target(protein, fat, carbs + extraCarbs), target(protein, fat, carbs));
    }

    private static NutritionTarget target(double protein, double fat, double carbs) {
        double kcal = KCAL_PER_G_PROTEIN * protein + KCAL_PER_G_FAT * fat + KCAL_PER_G_CARBS * carbs;
        return new NutritionTarget(round(kcal), round1(protein), round1(fat), round1(carbs));
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
