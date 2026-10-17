package dev.matswuuu.hse.questionnaire;

import dev.matswuuu.hse.analytics.AnalyticsEventType;
import dev.matswuuu.hse.analytics.AnalyticsService;
import dev.matswuuu.hse.common.CurrentUser;
import dev.matswuuu.hse.nutrition.DayTargets;
import dev.matswuuu.hse.nutrition.NutritionTargetCalculator;
import dev.matswuuu.hse.questionnaire.dto.QuestionnaireRequest;
import dev.matswuuu.hse.questionnaire.dto.QuestionnaireResponse;
import dev.matswuuu.hse.user.User;
import java.util.HashSet;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class QuestionnaireService {

    private final QuestionnaireRepository questionnaireRepository;
    private final NutritionTargetCalculator calculator;
    private final AnalyticsService analyticsService;

    public QuestionnaireService(
            QuestionnaireRepository questionnaireRepository,
            NutritionTargetCalculator calculator,
            AnalyticsService analyticsService) {
        this.questionnaireRepository = questionnaireRepository;
        this.calculator = calculator;
        this.analyticsService = analyticsService;
    }

    @Transactional
    public QuestionnaireResponse submit(QuestionnaireRequest request) {
        User user = CurrentUser.get();
        Questionnaire q = new Questionnaire();
        q.setUser(user);
        q.setSex(request.sex());
        q.setAge(request.age());
        q.setHeightCm(request.heightCm());
        q.setWeightKg(request.weightKg());
        q.setActivityLevel(request.activityLevel());
        q.setTrainingsPerWeek(request.trainingsPerWeek());
        q.setTrainingDays(request.trainingDays() == null ? new HashSet<>() : new HashSet<>(request.trainingDays()));
        q.setGoal(request.goal());
        q.setMealsPerDay(request.mealsPerDay());
        q.setExcludedTags(normalizeTags(request.excludedTags()));
        q.setExcludedFreeText(request.excludedFreeText());
        q.setCookingTime(request.cookingTime());
        q.setBudgetPerDay(request.budgetPerDay());
        q.setConsentAgreed(true);
        Questionnaire saved = questionnaireRepository.save(q);
        analyticsService.log(user, AnalyticsEventType.QUESTIONNAIRE_COMPLETED, "questionnaireId=" + saved.getId());
        return QuestionnaireResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public QuestionnaireResponse latest() {
        return QuestionnaireResponse.from(latestEntity());
    }

    @Transactional(readOnly = true)
    public DayTargets targets() {
        Questionnaire q = latestEntity();
        return calculator.calculate(
                q.getSex(), q.getAge(), q.getHeightCm(), q.getWeightKg(), q.getActivityLevel(), q.getGoal());
    }

    public Questionnaire latestEntity() {
        return latestEntityFor(CurrentUser.get());
    }

    public Questionnaire latestEntityFor(User user) {
        return questionnaireRepository
                .findFirstByUserIdOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No questionnaire found"));
    }

    private static Set<String> normalizeTags(Set<String> tags) {
        if (tags == null) {
            return new HashSet<>();
        }
        Set<String> result = new HashSet<>();
        for (String tag : tags) {
            if (tag != null && !tag.isBlank()) {
                result.add(tag.strip().toLowerCase());
            }
        }
        return result;
    }
}
