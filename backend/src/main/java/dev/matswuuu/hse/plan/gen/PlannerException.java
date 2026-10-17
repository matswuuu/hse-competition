package dev.matswuuu.hse.plan.gen;

public class PlannerException extends RuntimeException {

    public PlannerException(String message) {
        super(message);
    }

    public PlannerException(String message, Throwable cause) {
        super(message, cause);
    }
}
