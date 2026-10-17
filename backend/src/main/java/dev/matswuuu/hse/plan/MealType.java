package dev.matswuuu.hse.plan;

public enum MealType {
    BREAKFAST,
    LUNCH,
    DINNER,
    SNACK,
    SNACK_2;

    /** Meal slots for the requested number of meals per day (§4.1: 3–5). */
    public static MealType[] slotsFor(int mealsPerDay) {
        return switch (mealsPerDay) {
            case 3 -> new MealType[] {BREAKFAST, LUNCH, DINNER};
            case 4 -> new MealType[] {BREAKFAST, LUNCH, SNACK, DINNER};
            case 5 -> new MealType[] {BREAKFAST, SNACK, LUNCH, SNACK_2, DINNER};
            default -> throw new IllegalArgumentException("mealsPerDay must be 3-5");
        };
    }
}
