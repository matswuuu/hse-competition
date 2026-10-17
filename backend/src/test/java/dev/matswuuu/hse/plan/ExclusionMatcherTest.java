package dev.matswuuu.hse.plan;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ExclusionMatcherTest {

    @Test
    @DisplayName("inflected forms match: курица vs куриная, свинину vs свинина")
    void russianInflections() {
        assertThat(ExclusionMatcher.violates(Set.of("курица"), "Куриная грудка (филе)")).isTrue();
        assertThat(ExclusionMatcher.violates(Set.of("свинину"), "Свинина постная")).isTrue();
        assertThat(ExclusionMatcher.violates(Set.of("творога"), "Творог 5%")).isTrue();
        assertThat(ExclusionMatcher.violates(Set.of("треску"), "Треска", "рыба")).isTrue();
    }

    @Test
    @DisplayName("short tokens match whole words and stems")
    void shortTokens() {
        assertThat(ExclusionMatcher.violates(Set.of("рис"), "Рис белый (сухой)")).isTrue();
        assertThat(ExclusionMatcher.violates(Set.of("рыба"), "Лосось", "рыба")).isTrue();
        assertThat(ExclusionMatcher.violates(Set.of("яйца"), "Яйцо куриное")).isTrue();
        assertThat(ExclusionMatcher.violates(Set.of("орехи"), "Грецкий орех")).isTrue();
    }

    @Test
    @DisplayName("unrelated dishes pass")
    void noFalsePositives() {
        assertThat(ExclusionMatcher.violates(Set.of("гречка"), "Куриная грудка (филе)")).isFalse();
        assertThat(ExclusionMatcher.violates(Set.of("свинина"), "Говядина постная")).isFalse();
        assertThat(ExclusionMatcher.violates(Set.of(), "Свинина постная")).isFalse();
    }
}
