package dev.matswuuu.hse.analytics;

import dev.matswuuu.hse.analytics.dto.AnalyticsEventResponse;
import dev.matswuuu.hse.analytics.dto.LogEventRequest;
import dev.matswuuu.hse.common.CurrentUser;
import dev.matswuuu.hse.user.User;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void log(@Valid @RequestBody LogEventRequest request) {
        User user = CurrentUser.get();
        analyticsService.log(user, request.eventType(), request.payload());
    }

    @GetMapping("/mine")
    public List<AnalyticsEventResponse> mine() {
        User user = CurrentUser.get();
        return analyticsService.mine(user).stream().map(AnalyticsEventResponse::from).toList();
    }
}
