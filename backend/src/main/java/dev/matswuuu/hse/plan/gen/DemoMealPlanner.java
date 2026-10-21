package dev.matswuuu.hse.plan.gen;

import dev.matswuuu.hse.dish.DishCatalog;
import dev.matswuuu.hse.dish.DishTemplate;
import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.nutrition.NutritionProperties;
import dev.matswuuu.hse.nutrition.NutritionTarget;
import dev.matswuuu.hse.plan.ExclusionMatcher;
import dev.matswuuu.hse.plan.MealType;
import dev.matswuuu.hse.plan.PlanNutritionService;
import dev.matswuuu.hse.plan.dto.NutritionFacts;
import dev.matswuuu.hse.questionnaire.CookingTime;
import dev.matswuuu.hse.questionnaire.Questionnaire;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Deterministic code-only planner: template dishes from the dish DB + portion scaling to the
 * target. Always available — the §4.3 fallback when the LLM API is unreachable,
 * and the source of the demo-account plan (§6).
 */
@Service
@Primary
public class DemoMealPlanner implements MealPlanner {

    private static final Logger log = LoggerFactory.getLogger(DemoMealPlanner.class);

    /**
     * Meal-quota penalty weights tried in order; lower weights favour the day
     * total over meal balance.
     */
    private static final double[] QUOTA_WEIGHTS = {0.35, 0.15, 0.05, 0.0};

    /**
     * Retry rounds that still put fridge products first; later rounds pick by macros only, so a
     * fridge that fits the targets badly cannot cost the plan its tolerance.
     */
    private static final int FRIDGE_ROUNDS = 3;

    private static final double[] FIT_STEPS = {
            0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.35, 1.5, 1.75, 2.0, 2.4
    };

    private final PlanNutritionService nutritionService;
    private final NutritionProperties properties;
    private final DishCatalog dishCatalog;

    public DemoMealPlanner(
            PlanNutritionService nutritionService, NutritionProperties properties, DishCatalog dishCatalog) {
        this.nutritionService = nutritionService;
        this.properties = properties;
        this.dishCatalog = dishCatalog;
    }

    @Override
    public String name() {
        return "demo";
    }

    @Override
    public boolean available() {
        return true;
    }

    @Override
    public List<PlannedDay> plan(PlanContext context) {
        Map<String, Product> index = nutritionService.productIndex();
        List<DishTemplate> templates = dishCatalog.templates();
        Set<String> exclusions = collectExclusions(context.questionnaire());
        boolean[] training = context.trainingDays();
        int maxMinutes = maxMinutes(context.questionnaire().getCookingTime());
        List<PlannedDay> days = new ArrayList<>(7);
        Map<MealType, List<String>> recentBySlot = new HashMap<>();
        Map<String, FridgeLeft> fridge = context.round() < FRIDGE_ROUNDS ? fridgeLeft(context.fridge()) : Map.of();
        for (int day = 0; day < 7; day++) {
            NutritionTarget target = training[day]
                    ? context.targets().trainingDay()
                    : context.targets().restDay();
            NutritionFacts targetFacts = new NutritionFacts(
                    target.kcal(), target.proteinG(), target.fatG(), target.carbsG());
            MealType[] slots = MealType.slotsFor(context.questionnaire().getMealsPerDay());
            List<PlannedMeal> meals = new ArrayList<>(slots.length);
            Set<String> pickedToday = new HashSet<>();
            for (int s = 0; s < slots.length; s++) {
                PlannedMeal picked = pickBalanced(slots[s], targetFacts, meals, day, s, context.round(),
                        exclusions, maxMinutes, target.proteinG() >= 120
                                && (slots[s] == MealType.LUNCH || slots[s] == MealType.DINNER),
                        recentBySlot.getOrDefault(slots[s], List.of()), pickedToday,
                        context.bannedDishes(), templates, index, fridge);
                meals.add(picked);
                useUp(picked, fridge, index);
                pickedToday.add(picked.dishName());
                List<String> recent = recentBySlot.computeIfAbsent(slots[s], k -> new ArrayList<>());
                recent.add(picked.dishName());
                if (recent.size() > 2) {
                    recent.remove(0);
                }
            }
            List<PlannedMeal> fitted = fitDay(meals, targetFacts, quotas(slots.length), index);
            days.add(new PlannedDay(training[day], fitted));
        }
        return days;
    }

    /**
     * Kcal/macro share of the day target per meal slot count.
     */
    private static double[] quotas(int mealCount) {
        return switch (mealCount) {
            case 3 -> new double[]{0.30, 0.40, 0.30};
            case 4 -> new double[]{0.25, 0.35, 0.10, 0.30};
            case 5 -> new double[]{0.25, 0.10, 0.30, 0.10, 0.25};
            default ->
                    throw new IllegalArgumentException("mealsPerDay must be 3-5");
        };
    }

    /**
     * Day-level portion fitting ("подбор порций" per §4.3). Prefers balanced
     * meals, but relaxes the meal-quota penalty step by step until the day
     * lands inside the tolerance, keeping a safety margin for gram rounding.
     */
    private List<PlannedMeal> fitDay(
            List<PlannedMeal> meals, NutritionFacts target, double[] quotaShares,
            Map<String, Product> index) {
        double goal = properties.getTolerancePct() * 0.8;
        List<PlannedMeal> best = meals;
        double bestDeviation = Double.MAX_VALUE;
        for (double weight : QUOTA_WEIGHTS) {
            List<PlannedMeal> fitted = fitDay(meals, target, quotaShares, index, weight);
            double deviation = totalOf(fitted, index).maxDeviationPct(target);
            if (deviation < bestDeviation) {
                best = fitted;
                bestDeviation = deviation;
            }
            if (deviation <= goal) {
                break;
            }
        }
        return best;
    }

    /**
     * Per-ingredient factors found by coordinate descent. Score = day deviation
     * vs target + a weighted penalty pulling each meal toward its quota share,
     * so meals compensate each other while portions stay sane.
     */
    private List<PlannedMeal> fitDay(
            List<PlannedMeal> meals, NutritionFacts target, double[] quotaShares,
            Map<String, Product> index, double quotaWeight) {
        List<FitEntry> items = new ArrayList<>();
        for (int m = 0; m < meals.size(); m++) {
            List<PlannedIngredient> ings = meals.get(m).ingredients();
            for (int i = 0; i < ings.size(); i++) {
                Product product = nutritionService.resolve(ings.get(i).productName(), index);
                if (product == null) {
                    continue;
                }
                double ratio = ings.get(i).grams() / 100.0;
                items.add(new FitEntry(
                        m,
                        i,
                        new NutritionFacts(
                                product.getKcalPer100g() * ratio,
                                product.getProteinPer100g() * ratio,
                                product.getFatPer100g() * ratio,
                                product.getCarbsPer100g() * ratio)));
            }
        }
        List<PlannedMeal> unchanged = meals;
        if (items.isEmpty()) {
            return unchanged;
        }
        NutritionFacts[] quotas = new NutritionFacts[meals.size()];
        for (int m = 0; m < meals.size(); m++) {
            quotas[m] = new NutritionFacts(
                    target.kcal() * quotaShares[m],
                    target.proteinG() * quotaShares[m],
                    target.fatG() * quotaShares[m],
                    target.carbsG() * quotaShares[m]);
        }
        double[] factors = new double[items.size()];
        java.util.Arrays.fill(factors, 1.0);
        for (int sweep = 0; sweep < 6; sweep++) {
            boolean improved = false;
            for (int k = 0; k < items.size(); k++) {
                double bestF = factors[k];
                double bestScore = fitScore(factors, items, meals.size(), target, quotas, quotaWeight);
                for (double f : FIT_STEPS) {
                    factors[k] = f;
                    double score = fitScore(factors, items, meals.size(), target, quotas, quotaWeight);
                    if (score < bestScore - 1e-9) {
                        bestScore = score;
                        bestF = f;
                    }
                }
                factors[k] = bestF;
                if (bestF != 1.0) {
                    improved = true;
                }
            }
            if (!improved) {
                break;
            }
        }
        List<PlannedMeal> result = new ArrayList<>(meals.size());
        for (int m = 0; m < meals.size(); m++) {
            PlannedMeal meal = meals.get(m);
            List<PlannedIngredient> scaled = new ArrayList<>(meal.ingredients());
            for (int k = 0; k < items.size(); k++) {
                FitEntry item = items.get(k);
                if (item.meal == m) {
                    scaled.set(item.ing, meal.ingredients().get(item.ing).scaled(factors[k]));
                }
            }
            result.add(new PlannedMeal(meal.mealType(), meal.dishName(), meal.cookingTimeMin(),
                    List.copyOf(scaled), meal.steps()));
        }
        return result;
    }

    private static double fitScore(
            double[] factors, List<FitEntry> items, int mealCount, NutritionFacts target,
            NutritionFacts[] quotas, double quotaWeight) {
        NutritionFacts[] mealTotals = new NutritionFacts[mealCount];
        for (int m = 0; m < mealCount; m++) {
            mealTotals[m] = NutritionFacts.ZERO;
        }
        for (int k = 0; k < items.size(); k++) {
            FitEntry item = items.get(k);
            mealTotals[item.meal] = mealTotals[item.meal].add(item.base.scale(factors[k]));
        }
        NutritionFacts day = NutritionFacts.ZERO;
        double mealPenalty = 0;
        for (int m = 0; m < mealCount; m++) {
            day = day.add(mealTotals[m]);
            mealPenalty += mealTotals[m].maxDeviationPct(quotas[m]);
        }
        return day.maxDeviationPct(target) + quotaWeight * mealPenalty / mealCount;
    }

    private record FitEntry(int meal, int ing, NutritionFacts base) {

    }

    /**
     * Ingredient groups for portion fitting: 0 = fatty protein, 1 = pure fat, 2
     * = carbs, 3 = lean protein (protein-dominant with fat share below 25%).
     */
    private static int dominantGroup(Product product) {
        double p = product.getProteinPer100g() * 4;
        double f = product.getFatPer100g() * 9;
        double c = product.getCarbsPer100g() * 4;
        double total = p + f + c;
        if (total <= 0) {
            return 2;
        }
        if (c >= p && c >= f) {
            return 2;
        }
        if (f / total >= 0.4) {
            return 1;
        }
        if (p >= f && f / total < 0.25) {
            return 3;
        }
        return 0;
    }

    /**
     * Fits several meals' portions to a shared macro target, each keeping its current share of the calories.
     */
    public List<PlannedMeal> fitMeals(List<PlannedMeal> meals, NutritionFacts target) {
        Map<String, Product> index = nutritionService.productIndex();
        double total = 0;
        double[] kcal = new double[meals.size()];
        for (int m = 0; m < meals.size(); m++) {
            kcal[m] = nutritionService.factsFor(meals.get(m).ingredients(), index).kcal();
            total += kcal[m];
        }
        double[] shares = new double[meals.size()];
        for (int m = 0; m < meals.size(); m++) {
            shares[m] = total > 0 ? kcal[m] / total : 1.0 / meals.size();
        }
        return fitDay(meals, target, shares, index);
    }

    /**
     * Fits a single meal's portions to the given macro target.
     */
    public PlannedMeal fitSingle(PlannedMeal meal, NutritionFacts target) {
        return fitDay(List.of(meal), target, new double[]{1.0}, nutritionService.productIndex()).get(0);
    }

    /**
     * All dishes that could replace {@code exceptDish} in the slot (§4.7): no
     * exclusions, within the cooking-time limit when any such dish exists.
     */
    public List<PlannedMeal> alternatives(
            MealType slot, Set<String> exclusions, int maxMinutes, String exceptDish) {
        Map<String, Product> index = nutritionService.productIndex();
        List<DishTemplate> pool = dishCatalog.templates().stream()
                .filter(t -> fitsSlot(t, slot))
                .filter(t -> !t.dishName().equals(exceptDish))
                .toList();
        List<DishTemplate> ok = pool.stream()
                .filter(t -> !violates(t, exclusions, index))
                .toList();
        if (ok.isEmpty()) {
            throw new PlannerException("No replacement dish fits the exclusions");
        }
        List<DishTemplate> timely = ok.stream().filter(t -> t.minutes() <= maxMinutes).toList();
        List<DishTemplate> source = timely.isEmpty() ? ok : timely;
        return source.stream().map(t -> t.toMeal(slot)).toList();
    }

    /**
     * Picks a dish whose macro profile (calorie shares) best complements the
     * day composed so far. Rotates among the 3 best-scoring dishes for variety
     * across days.
     */
    private PlannedMeal pickBalanced(
            MealType slot, NutritionFacts target, List<PlannedMeal> picked,
            int day, int slotIdx, int round, Set<String> exclusions, int maxMinutes,
            boolean requireAnimalProtein, List<String> recentlyUsed, Set<String> pickedToday,
            Set<String> banned, List<DishTemplate> templates, Map<String, Product> index,
            Map<String, FridgeLeft> fridge) {
        List<DishTemplate> pool = templates.stream()
                .filter(t -> fitsSlot(t, slot))
                .filter(t -> !violates(t, exclusions, index))
                .toList();
        if (pool.isEmpty()) {
            throw new PlannerException("No dish fits the exclusions for slot " + slot);
        }
        if (requireAnimalProtein) {
            List<DishTemplate> anchored = pool.stream()
                    .filter(t -> hasAnimalProtein(t, index))
                    .toList();
            if (!anchored.isEmpty()) {
                pool = anchored;
            }
        }
        // Cooking-time limit is a hard preference: retry-round bans apply only
        // within the timely set and can never force slower dishes.
        List<DishTemplate> timely = pool.stream().filter(t -> t.minutes() <= maxMinutes).toList();
        List<DishTemplate> source;
        if (timely.isEmpty()) {
            log.warn("No dish within {} min for slot {}, ignoring time limit", maxMinutes, slot);
            source = pool;
        } else {
            List<DishTemplate> timelyUnbanned =
                    timely.stream().filter(t -> !banned.contains(t.dishName())).toList();
            source = timelyUnbanned.isEmpty() ? timely : timelyUnbanned;
        }
        NutritionFacts running = totalOf(picked, index);
        List<DishTemplate> ranked = new ArrayList<>(source);
        ranked.sort(Comparator.comparingDouble(t ->
                shareDistance(running.add(nutritionService.factsFor(t.ingredients(), index)), target)));
        List<DishTemplate> fresh = ranked.stream()
                .filter(t -> !recentlyUsed.contains(t.dishName()))
                .filter(t -> !pickedToday.contains(t.dishName()))
                .toList();
        List<DishTemplate> choice = fresh.isEmpty()
                ? ranked.stream().filter(t -> !pickedToday.contains(t.dishName())).toList()
                : fresh;
        if (choice.isEmpty()) {
            choice = ranked;
        }
        if (!fridge.isEmpty()) {
            // Fridge first: dishes using a product that runs out soonest, still balanced by macros.
            List<DishTemplate> usingFridge = ranked.stream()
                    .filter(t -> !pickedToday.contains(t.dishName()))
                    .filter(t -> fridgeUrgency(t, fridge, day, index) != Integer.MAX_VALUE)
                    .sorted(Comparator.comparingInt((DishTemplate t) -> fridgeUrgency(t, fridge, day, index))
                            .thenComparing(t -> recentlyUsed.contains(t.dishName())))
                    .toList();
            if (!usingFridge.isEmpty()) {
                return usingFridge.get(Math.abs(slotIdx + round) % Math.min(1 + round, usingFridge.size())).toMeal(slot);
            }
        }
        // Later retry rounds explore wider: top-2, then top-4, then top-6.
        int width = Math.min(2 + round * 2, choice.size());
        return choice.get(Math.abs(day + slotIdx + round) % width).toMeal(slot);
    }

    /** Fridge stock left while the week is composed, keyed by normalized catalog name. */
    private static final class FridgeLeft {
        double grams;
        final int expiresInDays;

        FridgeLeft(double grams, int expiresInDays) {
            this.grams = grams;
            this.expiresInDays = expiresInDays;
        }
    }

    private static Map<String, FridgeLeft> fridgeLeft(List<FridgeStock> stock) {
        Map<String, FridgeLeft> result = new HashMap<>();
        for (FridgeStock s : stock) {
            // Several packs of one product: the amount adds up, the soonest date counts.
            result.merge(key(s.productName()), new FridgeLeft(s.grams(), s.expiresInDays()),
                    (a, b) -> new FridgeLeft(a.grams + b.grams, Math.min(a.expiresInDays, b.expiresInDays)));
        }
        return result;
    }

    /**
     * Days until the soonest-expiring fridge product the dish uses that is still in stock and not
     * expired on {@code day}; {@link Integer#MAX_VALUE} when it uses none.
     */
    private int fridgeUrgency(DishTemplate template, Map<String, FridgeLeft> fridge, int day, Map<String, Product> index) {
        int best = Integer.MAX_VALUE;
        for (PlannedIngredient ingredient : template.ingredients()) {
            Product product = nutritionService.resolve(ingredient.productName(), index);
            FridgeLeft left = product == null ? null : fridge.get(key(product.getName()));
            if (left != null && left.grams > 0 && left.expiresInDays >= day) {
                best = Math.min(best, left.expiresInDays);
            }
        }
        return best;
    }

    private void useUp(PlannedMeal meal, Map<String, FridgeLeft> fridge, Map<String, Product> index) {
        if (fridge.isEmpty()) {
            return;
        }
        for (PlannedIngredient ingredient : meal.ingredients()) {
            Product product = nutritionService.resolve(ingredient.productName(), index);
            FridgeLeft left = product == null ? null : fridge.get(key(product.getName()));
            if (left != null) {
                left.grams -= ingredient.grams();
            }
        }
    }

    private static String key(String name) {
        return name.strip().toLowerCase(java.util.Locale.forLanguageTag("ru"));
    }

    /**
     * Distance between macro calorie-share profiles (protein/fat/carbs shares
     * sum to ~1).
     */
    private static double shareDistance(NutritionFacts actual, NutritionFacts target) {
        return Math.abs(shareP(actual) - shareP(target))
                + Math.abs(shareF(actual) - shareF(target))
                + Math.abs(shareC(actual) - shareC(target));
    }

    private static double shareP(NutritionFacts facts) {
        return facts.kcal() > 0 ? facts.proteinG() * 4 / facts.kcal() : 0;
    }

    private static double shareF(NutritionFacts facts) {
        return facts.kcal() > 0 ? facts.fatG() * 9 / facts.kcal() : 0;
    }

    private static double shareC(NutritionFacts facts) {
        return facts.kcal() > 0 ? facts.carbsG() * 4 / facts.kcal() : 0;
    }

    private static boolean fitsSlot(DishTemplate template, MealType slot) {
        if (template.slots().contains(slot)) {
            return true;
        }
        return (slot == MealType.SNACK || slot == MealType.SNACK_2) && template.slots().contains(MealType.SNACK);
    }

    /**
     * Meat, poultry or fish among ingredients (categories from the product
     * DB).
     */
    private static boolean hasAnimalProtein(DishTemplate template, Map<String, Product> index) {
        for (PlannedIngredient ingredient : template.ingredients()) {
            Product product = index.get(ingredient.productName().strip().toLowerCase());
            if (product != null
                    && (product.getCategory().equals("мясо")
                    || product.getCategory().equals("птица")
                    || product.getCategory().equals("рыба"))) {
                return true;
            }
        }
        return false;
    }

    private static boolean violates(DishTemplate template, Set<String> exclusions, Map<String, Product> index) {
        if (exclusions.isEmpty()) {
            return false;
        }
        List<String> texts = new ArrayList<>();
        texts.add(template.dishName());
        for (PlannedIngredient ingredient : template.ingredients()) {
            texts.add(ingredient.productName());
            Product product = index.get(ingredient.productName().strip().toLowerCase());
            if (product == null) {
                product = nutritionResolveFallback(ingredient.productName(), index);
            }
            if (product != null) {
                texts.add(product.getCategory());
            }
        }
        return ExclusionMatcher.violates(exclusions, texts.toArray(String[]::new));
    }

    private static Product nutritionResolveFallback(String name, Map<String, Product> index) {
        String key = name.strip().toLowerCase();
        for (Map.Entry<String, Product> entry : index.entrySet()) {
            if (key.contains(entry.getKey()) || entry.getKey().contains(key)) {
                return entry.getValue();
            }
        }
        return null;
    }

    private NutritionFacts totalOf(List<PlannedMeal> meals, Map<String, Product> index) {
        NutritionFacts total = NutritionFacts.ZERO;
        for (PlannedMeal meal : meals) {
            total = total.add(nutritionService.factsFor(meal.ingredients(), index));
        }
        return total;
    }

    public static Set<String> collectExclusions(Questionnaire questionnaire) {
        Set<String> result = new HashSet<>(questionnaire.getExcludedTags());
        if (questionnaire.getExcludedFreeText() != null) {
            for (String token : questionnaire.getExcludedFreeText().toLowerCase().split("[^а-яa-z]+")) {
                if (token.length() >= 3) {
                    result.add(token);
                }
            }
        }
        return result;
    }

    private static int maxMinutes(CookingTime cookingTime) {
        return switch (cookingTime) {
            case UP_TO_20 -> 20;
            case UP_TO_40 -> 40;
            case ANY -> Integer.MAX_VALUE;
        };
    }

}
