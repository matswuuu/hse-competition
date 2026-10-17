package dev.matswuuu.hse.plan;

import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.food.ProductRepository;
import dev.matswuuu.hse.plan.dto.NutritionFacts;
import dev.matswuuu.hse.plan.gen.PlannedIngredient;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * КБЖУ math over the product DB (§4.3 main rule: only code-computed numbers are used).
 * Ingredient labels are resolved to products by normalized name matching.
 */
@Service
public class PlanNutritionService {

    private final ProductRepository productRepository;

    public PlanNutritionService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public Map<String, Product> productIndex() {
        List<Product> products = productRepository.findAll();
        Map<String, Product> index = new HashMap<>(products.size() * 2);
        for (Product p : products) {
            index.putIfAbsent(normalize(p.getName()), p);
            index.putIfAbsent(normalize(stripParentheses(p.getName())), p);
        }
        return index;
    }

    public Product resolve(String ingredientName, Map<String, Product> index) {
        String key = normalize(ingredientName);
        Product exact = index.get(key);
        if (exact != null) {
            return exact;
        }
        String stripped = normalize(stripParentheses(ingredientName));
        Product byStripped = index.get(stripped);
        if (byStripped != null) {
            return byStripped;
        }
        // "гречка" should match "Гречка (сухая)": try contains-match on the longest key.
        Product best = null;
        for (Map.Entry<String, Product> entry : index.entrySet()) {
            String name = entry.getKey();
            if (name.length() < 4) {
                continue;
            }
            if (key.contains(name) || name.contains(key)) {
                if (best == null || name.length() > normalize(best.getName()).length()) {
                    best = entry.getValue();
                }
            }
        }
        return best;
    }

    public NutritionFacts factsFor(List<PlannedIngredient> ingredients, Map<String, Product> index) {
        NutritionFacts total = NutritionFacts.ZERO;
        for (PlannedIngredient ingredient : ingredients) {
            Product product = resolve(ingredient.productName(), index);
            if (product == null) {
                continue;
            }
            double ratio = ingredient.grams() / 100.0;
            total = total.add(new NutritionFacts(
                    product.getKcalPer100g() * ratio,
                    product.getProteinPer100g() * ratio,
                    product.getFatPer100g() * ratio,
                    product.getCarbsPer100g() * ratio));
        }
        return total;
    }

    public NutritionFacts factsForEntities(List<MealIngredient> ingredients) {
        NutritionFacts total = NutritionFacts.ZERO;
        for (MealIngredient ingredient : ingredients) {
            Product product = ingredient.getProduct();
            if (product == null) {
                continue;
            }
            double ratio = ingredient.getGrams() / 100.0;
            total = total.add(new NutritionFacts(
                    product.getKcalPer100g() * ratio,
                    product.getProteinPer100g() * ratio,
                    product.getFatPer100g() * ratio,
                    product.getCarbsPer100g() * ratio));
        }
        return total;
    }

    private static String normalize(String value) {
        return value.strip().toLowerCase(java.util.Locale.forLanguageTag("ru"));
    }

    private static String stripParentheses(String value) {
        return value.replaceAll("\\s*\\([^)]*\\)", "").strip();
    }
}
