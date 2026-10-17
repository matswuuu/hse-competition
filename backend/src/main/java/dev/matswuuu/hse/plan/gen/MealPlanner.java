package dev.matswuuu.hse.plan.gen;

import java.util.List;

/**
 * Picks dishes for 7 days: LLM via API when available, deterministic demo set otherwise.
 * Returned КБЖУ numbers (if any) are ignored — code recomputes everything (§4.3).
 */
public interface MealPlanner {

    String name();

    /** False when the planner cannot run (e.g. no API key) — it will be skipped. */
    boolean available();

    List<PlannedDay> plan(PlanContext context);
}
