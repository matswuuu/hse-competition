package dev.matswuuu.hse.pantry;

import dev.matswuuu.hse.common.CurrentUser;
import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.food.ProductService;
import dev.matswuuu.hse.food.ProductSource;
import dev.matswuuu.hse.pantry.dto.PantryItemRequest;
import dev.matswuuu.hse.pantry.dto.PantryItemResponse;
import dev.matswuuu.hse.pantry.dto.PantryItemUpdate;
import dev.matswuuu.hse.plan.MealIngredient;
import dev.matswuuu.hse.plan.PlanNutritionService;
import dev.matswuuu.hse.plan.gen.FridgeStock;
import dev.matswuuu.hse.purchase.PurchaseService;
import dev.matswuuu.hse.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class PantryService {

    /** Leftovers below this are treated as used up. */
    private static final double EMPTY_GRAMS = 1.0;

    private final PantryItemRepository repository;
    private final ProductService productService;
    private final PlanNutritionService nutritionService;
    private final PurchaseService purchaseService;

    public PantryService(
            PantryItemRepository repository,
            ProductService productService,
            PlanNutritionService nutritionService,
            PurchaseService purchaseService) {
        this.repository = repository;
        this.productService = productService;
        this.nutritionService = nutritionService;
        this.purchaseService = purchaseService;
    }

    @Transactional(readOnly = true)
    public List<PantryItemResponse> list() {
        LocalDate today = LocalDate.now();
        return repository.findByUserIdOrdered(CurrentUser.get().getId()).stream()
                .map(i -> PantryItemResponse.from(i, today))
                .toList();
    }

    @Transactional
    public PantryItemResponse add(PantryItemRequest request) {
        return PantryItemResponse.from(addItem(CurrentUser.get(), request), LocalDate.now());
    }

    /** Several items at once, e.g. the food lines of a receipt. */
    @Transactional
    public List<PantryItemResponse> addAll(List<PantryItemRequest> requests) {
        User user = CurrentUser.get();
        LocalDate today = LocalDate.now();
        return requests.stream().map(r -> PantryItemResponse.from(addItem(user, r), today)).toList();
    }

    private PantryItem addItem(User user, PantryItemRequest request) {
        Product product = request.productId() == null ? null : productService.requireVisible(request.productId());
        String name = product != null ? product.getName() : request.name() == null ? "" : request.name().strip();
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product or name is required");
        }
        Product catalog = product != null && product.getSource() == ProductSource.CATALOG
                ? product
                : nutritionService.matchCatalog(name, nutritionService.productIndex());
        String category = product != null ? product.getCategory() : catalog != null ? catalog.getCategory() : "прочее";
        PantrySource source = request.source() == null ? PantrySource.MANUAL : request.source();

        if (request.price() != null && request.price().signum() > 0 && source != PantrySource.RECEIPT) {
            // Receipt items are already counted by the receipt itself.
            purchaseService.recordManual(user, name, category, product != null ? product : catalog, request.price(), request.grams());
        }

        // Same product with the same date: top up instead of a second row.
        for (PantryItem existing : repository.findByUserIdOrdered(user.getId())) {
            if (existing.getName().equals(name)
                    && Objects.equals(existing.getExpiresAt(), request.expiresAt())
                    && Objects.equals(idOf(existing.getProduct()), idOf(product))) {
                existing.setGrams(existing.getGrams() + request.grams());
                return existing;
            }
        }
        PantryItem item = new PantryItem(user, name, category, source);
        item.setProduct(product);
        item.setCatalogProduct(catalog);
        item.setGrams(request.grams());
        item.setExpiresAt(request.expiresAt());
        return repository.save(item);
    }

    @Transactional
    public PantryItemResponse update(Long id, PantryItemUpdate update) {
        PantryItem item = requireOwned(id);
        item.setGrams(update.grams());
        item.setExpiresAt(update.expiresAt());
        return PantryItemResponse.from(item, LocalDate.now());
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(requireOwned(id));
    }

    /** Grams at home per catalog product id, expired items excluded (they are not food anymore). */
    @Transactional(readOnly = true)
    public Map<Long, Double> stockByCatalogProduct(User user, LocalDate today) {
        Map<Long, Double> stock = new HashMap<>();
        for (PantryItem item : repository.findByUserIdOrdered(user.getId())) {
            if (item.getCatalogProduct() != null && !expired(item, today)) {
                stock.merge(item.getCatalogProduct().getId(), item.getGrams(), Double::sum);
            }
        }
        return stock;
    }

    /** Catalog products expiring within {@code horizonDays} of {@code start}, soonest first, for the planner. */
    @Transactional(readOnly = true)
    public List<FridgeStock> expiringStock(User user, LocalDate start, int horizonDays) {
        List<FridgeStock> result = new ArrayList<>();
        for (PantryItem item : repository.findByUserIdOrdered(user.getId())) {
            if (item.getCatalogProduct() == null || item.getExpiresAt() == null || expired(item, start)) {
                continue;
            }
            long days = ChronoUnit.DAYS.between(start, item.getExpiresAt());
            if (days < horizonDays) {
                result.add(new FridgeStock(item.getCatalogProduct().getName(), item.getGrams(), (int) days));
            }
        }
        return result;
    }

    /** A meal was eaten: its ingredients leave the fridge, soonest-expiring first. */
    @Transactional
    public void consume(User user, List<MealIngredient> ingredients) {
        for (MealIngredient ingredient : ingredients) {
            if (ingredient.getProduct() == null) {
                continue;
            }
            double left = ingredient.getGrams();
            for (PantryItem item : repository.findByUserIdAndCatalogProductId(user.getId(), ingredient.getProduct().getId())) {
                if (left <= 0) {
                    break;
                }
                double taken = Math.min(left, item.getGrams());
                left -= taken;
                item.setGrams(item.getGrams() - taken);
                if (item.getGrams() < EMPTY_GRAMS) {
                    repository.delete(item);
                }
            }
        }
    }

    /**
     * The "eaten" mark was removed: puts the ingredients back onto items still in the fridge.
     * Items used up meanwhile are not recreated — their date is unknown.
     */
    @Transactional
    public void restore(User user, List<MealIngredient> ingredients) {
        for (MealIngredient ingredient : ingredients) {
            if (ingredient.getProduct() == null) {
                continue;
            }
            repository.findByUserIdAndCatalogProductId(user.getId(), ingredient.getProduct().getId()).stream()
                    .findFirst()
                    .ifPresent(item -> item.setGrams(item.getGrams() + ingredient.getGrams()));
        }
    }

    private PantryItem requireOwned(Long id) {
        return repository.findById(id)
                .filter(i -> i.getUser().getId().equals(CurrentUser.get().getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fridge item not found"));
    }

    private static boolean expired(PantryItem item, LocalDate today) {
        return item.getExpiresAt() != null && item.getExpiresAt().isBefore(today);
    }

    private static Long idOf(Product product) {
        return product == null ? null : product.getId();
    }
}
