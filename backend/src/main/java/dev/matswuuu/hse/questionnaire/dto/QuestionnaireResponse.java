package dev.matswuuu.hse.questionnaire.dto;

import dev.matswuuu.hse.questionnaire.ActivityLevel;
import dev.matswuuu.hse.questionnaire.CookingTime;
import dev.matswuuu.hse.questionnaire.Goal;
import dev.matswuuu.hse.questionnaire.Questionnaire;
import dev.matswuuu.hse.questionnaire.Sex;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

public record QuestionnaireResponse(
        Long id,
        Sex sex,
        int age,
        double heightCm,
        double weightKg,
        ActivityLevel activityLevel,
        int trainingsPerWeek,
        Set<Integer> trainingDays,
        Goal goal,
        int mealsPerDay,
        Set<String> excludedTags,
        String excludedFreeText,
        CookingTime cookingTime,
        BigDecimal budgetPerDay,
        Instant createdAt) {

    public static QuestionnaireResponse from(Questionnaire q) {
        return new QuestionnaireResponse(
                q.getId(), q.getSex(), q.getAge(), q.getHeightCm(), q.getWeightKg(),
                q.getActivityLevel(), q.getTrainingsPerWeek(), Set.copyOf(q.getTrainingDays()),
                q.getGoal(), q.getMealsPerDay(), Set.copyOf(q.getExcludedTags()),
                q.getExcludedFreeText(), q.getCookingTime(), q.getBudgetPerDay(), q.getCreatedAt());
    }
}
