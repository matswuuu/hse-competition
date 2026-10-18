package dev.matswuuu.hse.common;

/** Helpers for logging LLM failures compactly. */
public final class LogText {

    /** How much of a bad LLM answer goes into the log. */
    private static final int MAX_LOGGED_TEXT = 2000;

    private LogText() {}

    /** Exception chain as "Type: message <- Type: message", root cause last. */
    public static String describe(Throwable error) {
        if (error == null) {
            return "none";
        }
        StringBuilder result = new StringBuilder();
        for (Throwable t = error; t != null; t = t.getCause() == t ? null : t.getCause()) {
            if (!result.isEmpty()) {
                result.append(" <- ");
            }
            result.append(t.getClass().getSimpleName()).append(": ").append(t.getMessage());
        }
        return result.toString();
    }

    public static String truncate(String text) {
        if (text == null) {
            return "null";
        }
        return text.length() <= MAX_LOGGED_TEXT
                ? text
                : text.substring(0, MAX_LOGGED_TEXT) + "... [" + (text.length() - MAX_LOGGED_TEXT) + " more chars]";
    }

    public static long elapsedMs(long startedNanos) {
        return (System.nanoTime() - startedNanos) / 1_000_000;
    }
}
