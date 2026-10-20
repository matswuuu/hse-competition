package dev.matswuuu.hse.plan.dto;

import java.time.LocalDate;
import java.util.List;

/** {@code fridgeProducts}: fridge products the remaining meals use, by name. */
public record WeekResponse(
        Long planId, LocalDate startDate, boolean fallbackUsed, Long generationTimeMs, List<DayViewResponse> days,
        List<String> fridgeProducts) {}
