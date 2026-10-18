package dev.matswuuu.hse.dish;

import dev.matswuuu.hse.dish.DefaultMealsProperties.DefaultMeal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Inserts default dishes from meals.yaml whose name is not in the DB yet and adds
 * missing recipe URLs to existing ones, so new defaults are picked up on deploy
 * while dishes edited in the DB are otherwise left alone.
 */
@Component
@Order(2)
public class DishSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DishSeeder.class);

    private final DishRepository dishRepository;
    private final DefaultMealsProperties defaults;

    public DishSeeder(DishRepository dishRepository, DefaultMealsProperties defaults) {
        this.dishRepository = dishRepository;
        this.defaults = defaults;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Map<String, Dish> existing = dishRepository.findAll().stream()
                .collect(Collectors.toMap(Dish::getName, Function.identity()));
        List<Dish> missing = new ArrayList<>();
        int urlsAdded = 0;
        for (DefaultMeal meal : defaults.defaults()) {
            Dish dish = existing.get(meal.name());
            if (dish == null) {
                missing.add(toDish(meal));
                continue;
            }
            for (String url : meal.recipeUrls()) {
                if (dish.getRecipeUrls().add(url)) {
                    urlsAdded++;
                }
            }
        }
        dishRepository.saveAll(missing);
        if (!missing.isEmpty() || urlsAdded > 0) {
            log.info("Seeded {} default dishes, added {} recipe URLs to existing ones", missing.size(), urlsAdded);
        }
    }

    private static Dish toDish(DefaultMeal meal) {
        if (meal.slots() == null || meal.slots().isEmpty()) {
            throw new IllegalStateException("Default dish '" + meal.name() + "' has no slots");
        }
        return new Dish(
                meal.name(),
                meal.slots(),
                meal.cookingTimeMin(),
                meal.ingredients().stream()
                        .map(i -> new DishIngredient(i.product(), i.grams()))
                        .toList(),
                meal.steps(),
                meal.recipeUrls());
    }
}
