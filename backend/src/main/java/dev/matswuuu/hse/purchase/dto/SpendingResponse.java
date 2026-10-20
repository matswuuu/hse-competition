package dev.matswuuu.hse.purchase.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Spending over the last buckets of {@code period}: 14 days, 12 weeks (from Monday) or 12 months.
 * Buckets go oldest first; categories are sorted by amount, largest first.
 */
public record SpendingResponse(
        Period period, LocalDate from, LocalDate to, BigDecimal total, BigDecimal averagePerBucket,
        List<Bucket> buckets, List<CategoryTotal> categories) {

    public enum Period {
        DAY,
        WEEK,
        MONTH
    }

    public record Bucket(LocalDate start, BigDecimal total) {}

    public record CategoryTotal(String category, BigDecimal total, double sharePct) {}
}
