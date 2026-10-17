package dev.matswuuu.hse.plan;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MealPlanRepository extends JpaRepository<MealPlan, Long> {

    Optional<MealPlan> findFirstByUserIdOrderByCreatedAtDesc(Long userId);
}
