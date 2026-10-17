package dev.matswuuu.hse.plan.gen;

import java.util.List;

public record PlannedDay(boolean trainingDay, List<PlannedMeal> meals) {}
