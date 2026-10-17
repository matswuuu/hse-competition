package dev.matswuuu.hse.plan;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface MealEntryRepository extends JpaRepository<MealEntry, Long> {

    @Query("select m from MealEntry m where m.planDay.id = :dayId order by m.position asc, m.id asc")
    List<MealEntry> findByDayIdOrdered(Long dayId);
}
