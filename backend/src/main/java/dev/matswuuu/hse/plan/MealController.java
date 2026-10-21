package dev.matswuuu.hse.plan;

import dev.matswuuu.hse.plan.dto.CustomMealRequest;
import dev.matswuuu.hse.plan.dto.DishCardResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/meals")
public class MealController {

    private final PlanService planService;

    public MealController(PlanService planService) {
        this.planService = planService;
    }

    /** Dish card: grams, steps, time, portion КБЖУ (§4.6). */
    @GetMapping("/{id}")
    public DishCardResponse dish(@PathVariable Long id) {
        return planService.dishCard(id);
    }

    /** "Eaten" mark (§4.5). */
    @PatchMapping("/{id}/eaten")
    public DishCardResponse setEaten(@PathVariable Long id, @RequestBody EatenRequest request) {
        return planService.setEaten(id, request.eaten());
    }

    /** Replacement with close КБЖУ (§4.7, P1). */
    @PostMapping("/{id}/replace")
    public DishCardResponse replace(@PathVariable Long id) {
        return planService.replaceMeal(id);
    }

    /** The user's own meal in place of the planned one, as recognized from a photo or a description. */
    @PostMapping("/{id}/custom")
    public DishCardResponse replaceWithCustom(@PathVariable Long id, @Valid @RequestBody CustomMealRequest request) {
        return planService.replaceWithCustom(id, request);
    }

    public record EatenRequest(@NotNull Boolean eaten) {}
}
