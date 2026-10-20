package dev.matswuuu.hse.pantry;

import dev.matswuuu.hse.pantry.dto.PantryItemRequest;
import dev.matswuuu.hse.pantry.dto.PantryItemResponse;
import dev.matswuuu.hse.pantry.dto.PantryItemUpdate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** The user's fridge: what is at home, how much, and until when. */
@RestController
@RequestMapping("/api/pantry")
@Validated
public class PantryController {

    private final PantryService pantryService;

    public PantryController(PantryService pantryService) {
        this.pantryService = pantryService;
    }

    /** Soonest to expire first. */
    @GetMapping
    public List<PantryItemResponse> list() {
        return pantryService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PantryItemResponse add(@Valid @RequestBody PantryItemRequest request) {
        return pantryService.add(request);
    }

    @PostMapping("/batch")
    @ResponseStatus(HttpStatus.CREATED)
    public List<PantryItemResponse> addAll(@RequestBody @Size(max = 200) List<@Valid PantryItemRequest> requests) {
        return pantryService.addAll(requests);
    }

    @PutMapping("/{id}")
    public PantryItemResponse update(@PathVariable Long id, @Valid @RequestBody PantryItemUpdate update) {
        return pantryService.update(id, update);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        pantryService.delete(id);
    }
}
