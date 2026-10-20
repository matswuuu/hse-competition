package dev.matswuuu.hse.purchase;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {

    Optional<Purchase> findFirstByUserIdAndFiscalKey(Long userId, String fiscalKey);

    @Query("""
            select distinct p from Purchase p left join fetch p.items
            where p.user.id = :userId and p.purchasedAt >= :from and p.purchasedAt < :to
            order by p.purchasedAt desc""")
    List<Purchase> findInRange(Long userId, LocalDateTime from, LocalDateTime to);

    List<Purchase> findTop50ByUserIdOrderByPurchasedAtDesc(Long userId);
}
