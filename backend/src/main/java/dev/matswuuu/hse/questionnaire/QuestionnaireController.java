package dev.matswuuu.hse.questionnaire;

import dev.matswuuu.hse.analytics.AnalyticsEventType;
import dev.matswuuu.hse.analytics.AnalyticsService;
import dev.matswuuu.hse.common.CurrentUser;
import dev.matswuuu.hse.nutrition.DayTargets;
import dev.matswuuu.hse.questionnaire.dto.QuestionnaireRequest;
import dev.matswuuu.hse.questionnaire.dto.QuestionnaireResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/questionnaire")
public class QuestionnaireController {

    private final QuestionnaireService questionnaireService;
    private final AnalyticsService analyticsService;

    public QuestionnaireController(
            QuestionnaireService questionnaireService, AnalyticsService analyticsService) {
        this.questionnaireService = questionnaireService;
        this.analyticsService = analyticsService;
    }

    @PostMapping("/started")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void started() {
        analyticsService.log(CurrentUser.get(), AnalyticsEventType.QUESTIONNAIRE_STARTED, null);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public QuestionnaireResponse submit(@Valid @RequestBody QuestionnaireRequest request) {
        return questionnaireService.submit(request);
    }

    @GetMapping("/latest")
    public QuestionnaireResponse latest() {
        return questionnaireService.latest();
    }

    @GetMapping("/targets")
    public DayTargets targets() {
        return questionnaireService.targets();
    }
}
