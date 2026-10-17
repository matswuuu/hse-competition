package dev.matswuuu.hse.plan;

import dev.matswuuu.hse.plan.dto.DishCardResponse;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    public record EatenRequest(@NotNull Boolean eaten) {}
}
