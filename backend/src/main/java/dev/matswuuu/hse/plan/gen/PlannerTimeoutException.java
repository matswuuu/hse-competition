package dev.matswuuu.hse.plan.gen;

/** The planner ran out of its time budget; retrying it within the same generation is pointless. */
public class PlannerTimeoutException extends PlannerException {

    public PlannerTimeoutException(String message) {
        super(message);
    }

    public PlannerTimeoutException(String message, Throwable cause) {
        super(message, cause);
    }
}
