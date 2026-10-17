package dev.matswuuu.hse.analytics.dto;

import dev.matswuuu.hse.analytics.AnalyticsEventType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LogEventRequest(@NotNull AnalyticsEventType eventType, @Size(max = 1000) String payload) {}
