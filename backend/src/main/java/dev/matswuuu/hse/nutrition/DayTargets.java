package dev.matswuuu.hse.nutrition;

/** Targets differ for training and rest days (§4.2–4.3). */
public record DayTargets(NutritionTarget trainingDay, NutritionTarget restDay) {}
