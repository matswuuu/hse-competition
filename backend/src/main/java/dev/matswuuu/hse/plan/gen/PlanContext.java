package dev.matswuuu.hse.plan.gen;

import dev.matswuuu.hse.nutrition.DayTargets;
import dev.matswuuu.hse.questionnaire.Questionnaire;
import java.time.LocalDate;
import java.util.Set;

/** Everything a planner needs to compose 7 days. */
public record PlanContext(
        Questionnaire questionnaire, DayTargets targets, LocalDate startDate, int round,
        Set<String> bannedDishes) {

    /** Training flags for the 7 days, derived from the questionnaire weekdays. */
    public boolean[] trainingDays() {
        boolean[] result = new boolean[7];
        if (questionnaire.getTrainingsPerWeek() <= 0 || questionnaire.getTrainingDays().isEmpty()) {
            return result;
        }
        int startWeekday = startDate.getDayOfWeek().getValue(); // 1 = Monday
        for (int i = 0; i < 7; i++) {
            int weekday = (startWeekday - 1 + i) % 7 + 1;
            result[i] = questionnaire.getTrainingDays().contains(weekday);
        }
        return result;
    }
}
