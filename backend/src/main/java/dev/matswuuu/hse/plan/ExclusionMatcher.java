package dev.matswuuu.hse.plan;

import java.util.Locale;
import java.util.Set;

/**
 * Checks user exclusions (tags + free text) against dish/ingredient text (§4.3:
 * code verifies no excluded products end up in the plan).
 * Russian morphology tolerant: short tokens match whole words,
 * longer ones match by 5-letter prefix.
 */
public final class ExclusionMatcher {

    private ExclusionMatcher() {}

    public static boolean violates(Set<String> exclusions, String... texts) {
        for (String rawToken : exclusions) {
            String token = normalize(rawToken);
            if (token.length() < 3) {
                continue;
            }
            for (String rawText : texts) {
                if (rawText == null) {
                    continue;
                }
                if (matches(token, normalize(rawText))) {
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean matches(String token, String text) {
        if (text.contains(token)) {
            return true;
        }
        // Stem tolerant to Russian case endings: "курицу" -> "кури" matches "куриная".
        String stem = token.length() <= 4
                ? token.substring(0, Math.min(3, token.length()))
                : token.substring(0, token.length() - 2);
        for (String word : text.split("[^а-яa-z]+")) {
            if (word.length() >= 3 && word.startsWith(stem)) {
                return true;
            }
        }
        return false;
    }

    public static String normalize(String value) {
        return value.strip().toLowerCase(Locale.forLanguageTag("ru"));
    }
}
