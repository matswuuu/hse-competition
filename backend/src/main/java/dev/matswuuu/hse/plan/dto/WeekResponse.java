package dev.matswuuu.hse.plan.dto;

import java.time.LocalDate;
import java.util.List;

public record WeekResponse(
        Long planId, LocalDate startDate, boolean fallbackUsed, Long generationTimeMs, List<DayViewResponse> days) {}
