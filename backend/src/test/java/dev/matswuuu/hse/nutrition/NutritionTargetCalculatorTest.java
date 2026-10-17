package dev.matswuuu.hse.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import dev.matswuuu.hse.questionnaire.ActivityLevel;
import dev.matswuuu.hse.questionnaire.Goal;
import dev.matswuuu.hse.questionnaire.Sex;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class NutritionTargetCalculatorTest {

    private final NutritionTargetCalculator calculator =
            new NutritionTargetCalculator(new NutritionProperties());

    @Test
    @DisplayName("male gain: Mifflin-St Jeor x activity + goal correction")
    void maleGain() {
        // BMR = 10*80 + 6.25*180 - 5*25 + 5 = 1805; norm = 1805*1.55 = 2797.75; +10% = 3077.5
        DayTargets targets =
                calculator.calculate(Sex.MALE, 25, 180, 80, ActivityLevel.MODERATE, Goal.GAIN);

        assertThat(targets.trainingDay().kcal()).isCloseTo(3078, within(1.0));
        assertThat(targets.trainingDay().proteinG()).isCloseTo(160, within(0.1));
        assertThat(targets.trainingDay().fatG()).isCloseTo(80, within(0.1));
        assertThat(targets.trainingDay().carbsG()).isCloseTo(480, within(0.1)); // 5.0*80 + 1.0*80
        assertThat(targets.restDay().carbsG()).isCloseTo(400, within(0.1));
        assertThat(targets.restDay().kcal()).isEqualTo(targets.trainingDay().kcal());
    }

    @Test
    @DisplayName("female lose: correction below norm, above safe minimum")
    void femaleLose() {
        // BMR = 10*60 + 6.25*165 - 5*30 - 161 = 1320.25; norm = 1815.3; -15% = 1543
        DayTargets targets = calculator.calculate(Sex.FEMALE, 30, 165, 60, ActivityLevel.LIGHT, Goal.LOSE);

        assertThat(targets.restDay().kcal()).isCloseTo(1543, within(1.0));
        assertThat(targets.restDay().proteinG()).isCloseTo(132, within(0.1));
        assertThat(targets.trainingDay().carbsG()).isCloseTo(240, within(0.1)); // 3.0*60 + 1.0*60
    }

    @Test
    @DisplayName("target never drops below the safe minimum")
    void safeMinimumFloor() {
        // BMR = 10*45 + 6.25*150 - 5*30 - 161 = 1076.5; norm = 1291.8; -15% = 1098 -> floor 1200
        DayTargets targets =
                calculator.calculate(Sex.FEMALE, 30, 150, 45, ActivityLevel.SEDENTARY, Goal.LOSE);

        assertThat(targets.restDay().kcal()).isEqualTo(1200);
    }

    @Test
    @DisplayName("training day has more carbs than rest day")
    void trainingDayMoreCarbs() {
        DayTargets targets =
                calculator.calculate(Sex.MALE, 25, 180, 80, ActivityLevel.MODERATE, Goal.MAINTAIN);

        assertThat(targets.trainingDay().carbsG()).isGreaterThan(targets.restDay().carbsG());
    }
}
