package dev.matswuuu.hse.shopping;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/plans/current/shopping-list")
public class ShoppingListController {

    private final ShoppingListService shoppingListService;

    public ShoppingListController(ShoppingListService shoppingListService) {
        this.shoppingListService = shoppingListService;
    }

    /** Remaining plan ingredients by category, netted against the fridge (§4.8, P1). */
    @GetMapping
    public ShoppingListResponse get() {
        return shoppingListService.current();
    }

    /** Removes a product from this plan's list. */
    @DeleteMapping("/items/{productId}")
    public ShoppingListResponse dismiss(@PathVariable Long productId) {
        return shoppingListService.dismiss(productId);
    }

    @PostMapping("/items/{productId}/restore")
    public ShoppingListResponse restore(@PathVariable Long productId) {
        return shoppingListService.restore(productId);
    }
}
