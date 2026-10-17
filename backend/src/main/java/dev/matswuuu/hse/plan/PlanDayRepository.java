package dev.matswuuu.hse.plan;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlanDayRepository extends JpaRepository<PlanDay, Long> {

    List<PlanDay> findByPlanIdOrderByDayIndex(Long planId);
}
