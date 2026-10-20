package dev.matswuuu.hse.plan;

import dev.matswuuu.hse.plan.dto.DayViewResponse;
import dev.matswuuu.hse.plan.dto.WeekResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/plans")
public class PlanController {

    private final PlanService planService;

    public PlanController(PlanService planService) {
        this.planService = planService;
    }

    /** Generates a 7-day plan from the latest questionnaire (up to ~60s with LLM, instant demo). */
    @PostMapping("/generate")
    @ResponseStatus(HttpStatus.CREATED)
    public WeekResponse generate() {
        return planService.generate();
    }

    /** Latest plan, week view (§4.5). */
    @GetMapping("/current")
    public WeekResponse current() {
        return planService.current();
    }

    /** Day view: meals with КБЖУ + totals vs targets (§4.5). */
    @GetMapping("/current/days/{dayIndex}")
    public DayViewResponse day(@PathVariable int dayIndex) {
        return planService.day(dayIndex);
    }
}
