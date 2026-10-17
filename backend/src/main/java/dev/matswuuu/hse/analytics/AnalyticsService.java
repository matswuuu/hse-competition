package dev.matswuuu.hse.analytics;

import dev.matswuuu.hse.user.User;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsService {

    private final AnalyticsEventRepository repository;

    public AnalyticsService(AnalyticsEventRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void log(User user, AnalyticsEventType type, String payload) {
        repository.save(new AnalyticsEvent(user, type, payload));
    }

    @Transactional(readOnly = true)
    public List<AnalyticsEvent> mine(User user) {
        return repository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }
}
