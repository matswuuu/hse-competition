package dev.matswuuu.hse.purchase;

import dev.matswuuu.hse.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** One shopping trip: a scanned receipt, or a single item bought with its price typed in. */
@Entity
@Table(name = "purchases")
@Getter
@Setter
public class Purchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Local time printed on the receipt (or of the manual entry). */
    @Column(name = "purchased_at", nullable = false)
    private LocalDateTime purchasedAt;

    private String store;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PurchaseSource source;

    /** "fn/fd/fp" of a fiscal receipt, so the same receipt is not counted twice. */
    @Column(name = "fiscal_key", length = 100)
    private String fiscalKey;

    @OneToMany(mappedBy = "purchase", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<PurchaseItem> items = new ArrayList<>();

    protected Purchase() {}

    public Purchase(User user, LocalDateTime purchasedAt, PurchaseSource source) {
        this.user = user;
        this.purchasedAt = purchasedAt;
        this.source = source;
    }
}
