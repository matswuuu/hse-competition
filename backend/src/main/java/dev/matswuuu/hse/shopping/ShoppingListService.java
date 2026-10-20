package dev.matswuuu.hse.shopping;

import dev.matswuuu.hse.common.CurrentUser;
import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.food.ProductService;
import dev.matswuuu.hse.pantry.PantryService;
import dev.matswuuu.hse.plan.MealIngredient;
import dev.matswuuu.hse.plan.MealIngredientRepository;
import dev.matswuuu.hse.plan.MealPlan;
import dev.matswuuu.hse.plan.PlanService;
import dev.matswuuu.hse.shopping.ShoppingListResponse.CategoryGroup;
import dev.matswuuu.hse.shopping.ShoppingListResponse.DismissedItem;
import dev.matswuuu.hse.shopping.ShoppingListResponse.Item;
import dev.matswuuu.hse.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/** Shopping list (§4.8) netted against the fridge. */
@Service
public class ShoppingListService {

    private final PlanService planService;
    private final MealIngredientRepository ingredientRepository;
    private final ShoppingDismissalRepository dismissalRepository;
    private final PantryService pantryService;
    private final ProductService productService;

    public ShoppingListService(
            PlanService planService,
            MealIngredientRepository ingredientRepository,
            ShoppingDismissalRepository dismissalRepository,
            PantryService pantryService,
            ProductService productService) {
        this.planService = planService;
        this.ingredientRepository = ingredientRepository;
        this.dismissalRepository = dismissalRepository;
        this.pantryService = pantryService;
        this.productService = productService;
    }

    @Transactional(readOnly = true)
    public ShoppingListResponse current() {
        User user = CurrentUser.get();
        MealPlan plan = planService.latestPlan();
        LocalDate today = LocalDate.now();
        Map<Long, Product> products = new HashMap<>();
        Map<Long, Double> needed = new HashMap<>();
        for (MealIngredient ingredient : ingredientRepository.findByPlanId(plan.getId())) {
            Product product = ingredient.getProduct();
            // Past days and eaten meals need nothing anymore.
            if (product == null || ingredient.getMeal().isEaten()
                    || ingredient.getMeal().getPlanDay().getDate().isBefore(today)) {
                continue;
            }
            products.putIfAbsent(product.getId(), product);
            needed.merge(product.getId(), ingredient.getGrams(), Double::sum);
        }
        List<ShoppingDismissal> dismissals = dismissalRepository.findByPlanId(plan.getId());
        Set<Long> dismissed = dismissals.stream().map(d -> d.getProduct().getId()).collect(Collectors.toSet());
        Map<Long, Double> stock = pantryService.stockByCatalogProduct(user, today);

        Map<String, List<Item>> byCategory = new TreeMap<>();
        for (Map.Entry<Long, Double> entry : needed.entrySet()) {
            if (dismissed.contains(entry.getKey())) {
                continue;
            }
            Product product = products.get(entry.getKey());
            double need = entry.getValue();
            double inFridge = stock.getOrDefault(entry.getKey(), 0.0);
            byCategory.computeIfAbsent(product.getCategory(), c -> new java.util.ArrayList<>())
                    .add(new Item(product.getId(), product.getName(), round(need), round(Math.min(inFridge, need)),
                            round(Math.max(0, need - inFridge))));
        }
        List<CategoryGroup> groups = byCategory.entrySet().stream()
                .map(e -> new CategoryGroup(e.getKey(), e.getValue().stream()
                        .sorted(Comparator.comparing(Item::productName))
                        .toList()))
                .toList();
        List<DismissedItem> dismissedItems = dismissals.stream()
                .map(d -> new DismissedItem(d.getProduct().getId(), d.getProduct().getName()))
                .sorted(Comparator.comparing(DismissedItem::productName))
                .toList();
        return new ShoppingListResponse(groups, dismissedItems);
    }

    @Transactional
    public ShoppingListResponse dismiss(Long productId) {
        MealPlan plan = planService.latestPlan();
        if (dismissalRepository.findByPlanIdAndProductId(plan.getId(), productId).isEmpty()) {
            dismissalRepository.save(new ShoppingDismissal(plan, productService.requireVisible(productId)));
        }
        return current();
    }

    @Transactional
    public ShoppingListResponse restore(Long productId) {
        MealPlan plan = planService.latestPlan();
        dismissalRepository.findByPlanIdAndProductId(plan.getId(), productId).ifPresent(dismissalRepository::delete);
        return current();
    }

    private static double round(double grams) {
        return Math.round(grams * 10.0) / 10.0;
    }
}
