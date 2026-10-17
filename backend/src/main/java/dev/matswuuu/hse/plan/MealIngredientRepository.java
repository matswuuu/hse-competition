package dev.matswuuu.hse.plan;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface MealIngredientRepository extends JpaRepository<MealIngredient, Long> {

    List<MealIngredient> findByMealId(Long mealId);

    @Query("select i from MealIngredient i join fetch i.meal m join fetch m.planDay d where d.plan.id = :planId")
    List<MealIngredient> findByPlanId(Long planId);
}
