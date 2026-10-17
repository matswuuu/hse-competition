package dev.matswuuu.hse.plan.dto;

public record NutritionFacts(double kcal, double proteinG, double fatG, double carbsG) {

    public static final NutritionFacts ZERO = new NutritionFacts(0, 0, 0, 0);

    public NutritionFacts add(NutritionFacts other) {
        return new NutritionFacts(
                kcal + other.kcal(),
                proteinG + other.proteinG(),
                fatG + other.fatG(),
                carbsG + other.carbsG());
    }

    public NutritionFacts scale(double factor) {
        return new NutritionFacts(kcal * factor, proteinG * factor, fatG * factor, carbsG * factor);
    }

    /** Max relative deviation of kcal/protein/fat/carbs from the target, percent. */
    public double maxDeviationPct(NutritionFacts target) {
        return Math.max(
                Math.max(dev(kcal, target.kcal()), dev(proteinG, target.proteinG())),
                Math.max(dev(fatG, target.fatG()), dev(carbsG, target.carbsG())));
    }

    private static double dev(double actual, double target) {
        if (target <= 0) {
            return actual <= 0 ? 0 : 100;
        }
        return Math.abs(actual - target) / target * 100.0;
    }
}
