package dev.matswuuu.hse.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import dev.matswuuu.hse.questionnaire.ActivityLevel;
import dev.matswuuu.hse.questionnaire.Goal;
import dev.matswuuu.hse.questionnaire.Sex;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class NutritionTargetCalculatorTest {

    private final NutritionTargetCalculator calculator =
            new NutritionTargetCalculator(new NutritionProperties());

    @Test
    @DisplayName("male gain: Mifflin-St Jeor x activity + goal correction, carbs fill the rest")
    void maleGain() {
        // BMR = 10*80 + 6.25*180 - 5*25 + 5 = 1805; norm = 1805*1.55 = 2797.75; +10% = 3077.5
        // P = 2.0*80 = 160, F = 1.0*80 = 80, C = (3077.5 - 640 - 720) / 4 = 429.4
        DayTargets targets =
                calculator.calculate(Sex.MALE, 25, 180, 80, ActivityLevel.MODERATE, Goal.GAIN);

        assertThat(targets.restDay().kcal()).isCloseTo(3078, within(1.0));
        assertThat(targets.restDay().proteinG()).isCloseTo(160, within(0.1));
        assertThat(targets.restDay().fatG()).isCloseTo(80, within(0.1));
        assertThat(targets.restDay().carbsG()).isCloseTo(429.4, within(0.1));
        // Training day: +1.0 g/kg carbs = +80 g = +320 kcal
        assertThat(targets.trainingDay().carbsG()).isCloseTo(509.4, within(0.1));
        assertThat(targets.trainingDay().kcal()).isCloseTo(3398, within(1.0));
    }

    @Test
    @DisplayName("female lose: correction below norm, above safe minimum")
    void femaleLose() {
        // BMR = 10*60 + 6.25*165 - 5*30 - 161 = 1320.25; norm = 1815.3; -15% = 1543
        // P = 2.2*60 = 132, F = 0.9*60 = 54, C = (1543 - 528 - 486) / 4 = 132.3
        DayTargets targets = calculator.calculate(Sex.FEMALE, 30, 165, 60, ActivityLevel.LIGHT, Goal.LOSE);

        assertThat(targets.restDay().kcal()).isCloseTo(1543, within(1.0));
        assertThat(targets.restDay().proteinG()).isCloseTo(132, within(0.1));
        assertThat(targets.restDay().carbsG()).isCloseTo(132.3, within(0.1));
    }

    @ParameterizedTest
    @CsvSource({
        "MALE, 25, 180, 80, MODERATE, GAIN",
        "FEMALE, 22, 160, 95, SEDENTARY, GAIN",
        "MALE, 35, 170, 110, SEDENTARY, LOSE",
        "FEMALE, 30, 150, 45, SEDENTARY, LOSE",
        "MALE, 19, 190, 60, VERY_ACTIVE, MAINTAIN",
    })
    @DisplayName("macros always add up to the calorie target")
    void macrosMatchCalories(Sex sex, int age, double height, double weight, ActivityLevel activity, Goal goal) {
        DayTargets targets = calculator.calculate(sex, age, height, weight, activity, goal);

        for (NutritionTarget t : new NutritionTarget[] {targets.restDay(), targets.trainingDay()}) {
            double fromMacros = 4 * t.proteinG() + 9 * t.fatG() + 4 * t.carbsG();
            assertThat(fromMacros).isCloseTo(t.kcal(), within(2.0));
            assertThat(t.carbsG()).isGreaterThanOrEqualTo(2.0 * weight - 0.1);
        }
    }

    @Test
    @DisplayName("target never drops below the safe minimum")
    void safeMinimumFloor() {
        // BMR = 10*45 + 6.25*150 - 5*30 - 161 = 1076.5; norm = 1291.8; -15% = 1098 -> floor 1200
        DayTargets targets =
                calculator.calculate(Sex.FEMALE, 30, 150, 45, ActivityLevel.SEDENTARY, Goal.LOSE);

        // P = 99, F = 40.5, C = (1200 - 396 - 364.5) / 4 = 109.9 (above the 90 g minimum)
        assertThat(targets.restDay().kcal()).isCloseTo(1200, within(1.0));
    }

    @Test
    @DisplayName("training day has more carbs than rest day")
    void trainingDayMoreCarbs() {
        DayTargets targets =
                calculator.calculate(Sex.MALE, 25, 180, 80, ActivityLevel.MODERATE, Goal.MAINTAIN);

        assertThat(targets.trainingDay().carbsG()).isGreaterThan(targets.restDay().carbsG());
    }
}
