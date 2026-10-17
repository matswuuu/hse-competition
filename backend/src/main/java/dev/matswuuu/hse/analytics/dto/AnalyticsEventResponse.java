package dev.matswuuu.hse.analytics.dto;

import dev.matswuuu.hse.analytics.AnalyticsEvent;
import dev.matswuuu.hse.analytics.AnalyticsEventType;
import java.time.Instant;

public record AnalyticsEventResponse(Long id, AnalyticsEventType eventType, String payload, Instant createdAt) {

    public static AnalyticsEventResponse from(AnalyticsEvent e) {
        return new AnalyticsEventResponse(e.getId(), e.getEventType(), e.getPayload(), e.getCreatedAt());
    }
}
