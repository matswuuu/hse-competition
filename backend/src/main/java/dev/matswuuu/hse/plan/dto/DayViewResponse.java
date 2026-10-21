package dev.matswuuu.hse.plan.dto;

import java.time.LocalDate;
import java.util.List;

public record DayViewResponse(
        Long dayId,
        int dayIndex,
        LocalDate date,
        boolean trainingDay,
        NutritionFacts targets,
        NutritionFacts totals,
        boolean withinTolerance,
        double deviationPct,
        List<MealSummaryResponse> meals,
        boolean rebalanceAvailable) {}
