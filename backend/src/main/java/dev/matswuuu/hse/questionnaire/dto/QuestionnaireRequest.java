package dev.matswuuu.hse.questionnaire.dto;

import dev.matswuuu.hse.questionnaire.ActivityLevel;
import dev.matswuuu.hse.questionnaire.CookingTime;
import dev.matswuuu.hse.questionnaire.Goal;
import dev.matswuuu.hse.questionnaire.Sex;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Set;

public record QuestionnaireRequest(
        @NotNull Sex sex,
        @NotNull @Min(14) @Max(100) Integer age,
        @NotNull @Min(100) @Max(250) Double heightCm,
        @NotNull @Min(30) @Max(300) Double weightKg,
        @NotNull ActivityLevel activityLevel,
        @NotNull @Min(0) @Max(7) Integer trainingsPerWeek,
        @Size(max = 7) Set<@Min(1) @Max(7) Integer> trainingDays,
        @NotNull Goal goal,
        @NotNull @Min(3) @Max(5) Integer mealsPerDay,
        Set<@Size(max = 50) String> excludedTags,
        @Size(max = 500) String excludedFreeText,
        @NotNull CookingTime cookingTime,
        @DecimalMin("0.0") BigDecimal budgetPerDay,
        @AssertTrue(message = "Consent to data processing is required") boolean consentAgreed) {

}
