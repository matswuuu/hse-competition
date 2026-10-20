package dev.matswuuu.hse.shopping;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShoppingDismissalRepository extends JpaRepository<ShoppingDismissal, Long> {

    List<ShoppingDismissal> findByPlanId(Long planId);

    Optional<ShoppingDismissal> findByPlanIdAndProductId(Long planId, Long productId);
}
