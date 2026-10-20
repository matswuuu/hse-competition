package dev.matswuuu.hse.plan;

import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.food.ProductRepository;
import dev.matswuuu.hse.food.ProductSource;
import dev.matswuuu.hse.plan.dto.NutritionFacts;
import dev.matswuuu.hse.plan.gen.PlannedIngredient;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
        List<Product> products = productRepository.findBySource(ProductSource.CATALOG);
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

    /**
     * Catalog product for a free-form name from a package or a receipt
     * ("ГРУДКА КУРИНАЯ ФИЛЕ ОХЛ 1КГ" -> "Куриная грудка (филе)"): exact/contains match first,
     * then word overlap tolerant to Russian endings. At least half of the catalog name's words must
     * be present; null when nothing is close enough.
     */
    public Product matchCatalog(String rawName, Map<String, Product> index) {
        if (rawName == null || rawName.isBlank()) {
            return null;
        }
        String name = normalize(rawName).replace('ё', 'е').replace(',', '.');
        Product direct = resolve(name, index);
        if (direct != null) {
            return direct;
        }
        List<String> words = words(name);
        Product best = null;
        double bestScore = 0;
        for (Product product : new java.util.LinkedHashSet<>(index.values())) {
            List<String> productWords = words(normalize(stripParentheses(product.getName())).replace('ё', 'е'));
            if (productWords.isEmpty()) {
                continue;
            }
            int matched = 0;
            for (String pw : productWords) {
                if (words.stream().anyMatch(w -> sameWord(w, pw))) {
                    matched++;
                }
            }
            double share = (double) matched / productWords.size();
            // Prefer more matched words, then fuller coverage of the catalog name.
            double score = matched + share;
            if (share >= 0.5 && score > bestScore) {
                best = product;
                bestScore = score;
            }
        }
        return best;
    }

    private static List<String> words(String text) {
        return java.util.Arrays.stream(text.split("[^а-яa-z0-9.%]+"))
                .map(w -> w.replaceAll("^\\.+|\\.+$", ""))
                .filter(w -> w.length() >= 3 || w.matches(".*\\d.*"))
                .toList();
    }

    private static boolean sameWord(String a, String b) {
        if (a.equals(b)) {
            return true;
        }
        if (a.length() < 4 || b.length() < 4 || a.matches(".*\\d.*") || b.matches(".*\\d.*")) {
            return false;
        }
        // Stem match: "куриная"/"куриной", "грудка"/"грудки".
        int stem = Math.min(5, Math.min(a.length(), b.length()) - 1);
        return a.regionMatches(0, b, 0, Math.max(stem, 3));
    }

    private static String normalize(String value) {
        return value.strip().toLowerCase(java.util.Locale.forLanguageTag("ru"));
    }

    private static String stripParentheses(String value) {
        return value.replaceAll("\\s*\\([^)]*\\)", "").strip();
    }
}
