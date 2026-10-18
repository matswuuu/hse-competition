package dev.matswuuu.hse.dish;

import dev.matswuuu.hse.plan.gen.PlannedIngredient;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read access to the dish DB for the planners. */
@Service
public class DishCatalog {

    private final DishRepository dishRepository;

    public DishCatalog(DishRepository dishRepository) {
        this.dishRepository = dishRepository;
    }

    /** All dishes in a stable order (by id), so the planner stays deterministic. */
    @Transactional(readOnly = true)
    public List<DishTemplate> templates() {
        return dishRepository.findAll().stream()
                .sorted(Comparator.comparing(Dish::getId))
                .map(DishCatalog::toTemplate)
                .toList();
    }

    /** Recipe links for a planned dish; empty when the dish is not in the DB (e.g. an LLM dish). */
    @Transactional(readOnly = true)
    public List<String> recipeUrls(String dishName) {
        return dishRepository.findByName(dishName)
                .map(dish -> List.copyOf(dish.getRecipeUrls()))
                .orElse(List.of());
    }

    private static DishTemplate toTemplate(Dish dish) {
        return new DishTemplate(
                dish.getName(),
                Set.copyOf(dish.getSlots()),
                dish.getCookingTimeMin(),
                dish.getIngredients().stream()
                        .map(i -> new PlannedIngredient(i.getProductName(), i.getGrams()))
                        .toList(),
                List.copyOf(dish.getSteps()));
    }
}
