package dev.matswuuu.hse.purchase;

import dev.matswuuu.hse.purchase.dto.SpendingResponse;
import dev.matswuuu.hse.purchase.dto.SpendingResponse.Period;
import dev.matswuuu.hse.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PurchaseServiceTest {

    @Test
    void readsWeightFromReceiptLines() {
        assertThat(PurchaseService.grams("МОЛОКО 3,2% 930МЛ", 2)).isEqualTo(1860.0);
        assertThat(PurchaseService.grams("Гречка ядрица 0,9кг", 1)).isEqualTo(900.0);
        assertThat(PurchaseService.grams("БАНАНЫ ВЕС", 0.532)).isEqualTo(532.0);
        assertThat(PurchaseService.grams("Хлеб Бородинский", 1)).isNull();
    }

    @Test
    void spotsNonFood() {
        assertThat(PurchaseService.isNonFood("ПАКЕТ-МАЙКА 65х40")).isTrue();
        assertThat(PurchaseService.isNonFood("Салфетки бумажные")).isTrue();
        assertThat(PurchaseService.isNonFood("Кефир 2.5% 1л")).isFalse();
    }

    @Test
    void sumsSpendingByWeekAndCategory() {
        User user = mock(User.class);
        when(user.getId()).thenReturn(1L);
        PurchaseRepository repository = mock(PurchaseRepository.class);
        when(repository.findInRange(anyLong(), any(), any())).thenReturn(List.of(
                purchase(user, LocalDateTime.of(2026, 10, 19, 10, 0), "молочные", "300"),
                purchase(user, LocalDateTime.of(2026, 10, 20, 10, 0), "мясо", "500"),
                purchase(user, LocalDateTime.of(2026, 10, 12, 10, 0), "молочные", "200")));
        var service = new PurchaseService(repository, null, null, null, null, mock(PlatformTransactionManager.class));

        // Tuesday 20 Oct 2026: the last bucket is the week from Monday 19 Oct.
        SpendingResponse spending = service.spending(user, Period.WEEK, LocalDate.of(2026, 10, 20));

        assertThat(spending.buckets()).hasSize(12);
        assertThat(spending.to()).isEqualTo(LocalDate.of(2026, 10, 25));
        assertThat(spending.buckets().getLast().start()).isEqualTo(LocalDate.of(2026, 10, 19));
        assertThat(spending.buckets().getLast().total()).isEqualByComparingTo("800");
        assertThat(spending.buckets().get(10).total()).isEqualByComparingTo("200");
        assertThat(spending.total()).isEqualByComparingTo("1000");
        assertThat(spending.categories().getFirst().category()).isEqualTo("молочные");
        assertThat(spending.categories().getFirst().sharePct()).isEqualTo(50.0);
    }

    private static Purchase purchase(User user, LocalDateTime at, String category, String sum) {
        Purchase purchase = new Purchase(user, at, PurchaseSource.MANUAL);
        PurchaseItem item = new PurchaseItem(purchase, "x", category);
        ReflectionTestUtils.setField(item, "sum", new BigDecimal(sum));
        purchase.getItems().add(item);
        return purchase;
    }
}
