package dev.matswuuu.hse.plan.gen;

import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.nutrition.NutritionTarget;
import dev.matswuuu.hse.plan.ExclusionMatcher;
import dev.matswuuu.hse.plan.MealType;
import dev.matswuuu.hse.plan.PlanNutritionService;
import dev.matswuuu.hse.plan.dto.NutritionFacts;
import dev.matswuuu.hse.questionnaire.CookingTime;
import dev.matswuuu.hse.questionnaire.Questionnaire;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

/**
 * Deterministic code-only planner: template dishes + portion scaling to the target.
 * Always available — the §4.3 fallback when the LLM API is unreachable,
 * and the source of the demo-account plan (§6).
 */
@Service
@Primary
public class DemoMealPlanner implements MealPlanner {

    private static final Logger log = LoggerFactory.getLogger(DemoMealPlanner.class);

    private final PlanNutritionService nutritionService;

    public DemoMealPlanner(PlanNutritionService nutritionService) {
        this.nutritionService = nutritionService;
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
        Set<String> exclusions = collectExclusions(context.questionnaire());
        boolean[] training = context.trainingDays();
        int maxMinutes = maxMinutes(context.questionnaire().getCookingTime());
        List<PlannedDay> days = new ArrayList<>(7);
        Map<MealType, List<String>> recentBySlot = new HashMap<>();
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
                        context.bannedDishes(), index);
                meals.add(picked);
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

    /** Kcal/macro share of the day target per meal slot count. */
    private static double[] quotas(int mealCount) {
        return switch (mealCount) {
            case 3 -> new double[] {0.30, 0.40, 0.30};
            case 4 -> new double[] {0.25, 0.35, 0.10, 0.30};
            case 5 -> new double[] {0.25, 0.10, 0.30, 0.10, 0.25};
            default -> throw new IllegalArgumentException("mealsPerDay must be 3-5");
        };
    }

    /**
     * Day-level portion fitting ("подбор порций" per §4.3): per-ingredient factors
     * found by coordinate descent. Score = day deviation vs target + a penalty
     * pulling each meal toward its quota share, so meals compensate each other
     * while portions stay sane.
     */
    private List<PlannedMeal> fitDay(
            List<PlannedMeal> meals, NutritionFacts target, double[] quotaShares,
            Map<String, Product> index) {
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
        double[] steps = {0.3, 0.45, 0.6, 0.75, 0.9, 1.0, 1.15, 1.3, 1.5, 1.75, 2.0, 2.4};
        double[] factors = new double[items.size()];
        java.util.Arrays.fill(factors, 1.0);
        for (int sweep = 0; sweep < 4; sweep++) {
            boolean improved = false;
            for (int k = 0; k < items.size(); k++) {
                double bestF = factors[k];
                double bestScore = fitScore(factors, items, meals.size(), target, quotas);
                for (double f : steps) {
                    factors[k] = f;
                    double score = fitScore(factors, items, meals.size(), target, quotas);
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
            NutritionFacts[] quotas) {
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
        return day.maxDeviationPct(target) + 0.35 * mealPenalty / mealCount;
    }

    private record FitEntry(int meal, int ing, NutritionFacts base) {}

    /**
     * Ingredient groups for portion fitting: 0 = fatty protein, 1 = pure fat,
     * 2 = carbs, 3 = lean protein (protein-dominant with fat share below 25%).
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

    /** Alternative dish for the same slot, used by dish replacement (§4.7).
     * Fits a single meal's portions to the given macro target. */
    public PlannedMeal fitSingle(PlannedMeal meal, NutritionFacts target) {
        return fitDay(List.of(meal), target, new double[] {1.0}, nutritionService.productIndex()).get(0);
    }

    /** Alternative dish for the same slot, used by dish replacement (§4.7). */    public PlannedMeal alternative(
            MealType slot, Set<String> exclusions, int maxMinutes, String exceptDish, int seed) {
        Map<String, Product> index = nutritionService.productIndex();
        List<DishTemplate> pool = TEMPLATES.stream()
                .filter(t -> fitsSlot(t, slot))
                .filter(t -> !t.dishName.equals(exceptDish))
                .toList();
        List<DishTemplate> ok = pool.stream()
                .filter(t -> !violates(t, exclusions, index))
                .toList();
        if (ok.isEmpty()) {
            throw new PlannerException("No replacement dish fits the exclusions");
        }
        List<DishTemplate> timely = ok.stream().filter(t -> t.minutes <= maxMinutes).toList();
        List<DishTemplate> source = timely.isEmpty() ? ok : timely;
        return source.get(Math.abs(seed) % source.size()).toMeal(slot);
    }

    /**
     * Picks a dish whose macro profile (calorie shares) best complements the day composed so far.
     * Rotates among the 3 best-scoring dishes for variety across days.
     */
    private PlannedMeal pickBalanced(
            MealType slot, NutritionFacts target, List<PlannedMeal> picked,
            int day, int slotIdx, int round, Set<String> exclusions, int maxMinutes,
            boolean requireAnimalProtein, List<String> recentlyUsed, Set<String> pickedToday,
            Set<String> banned, Map<String, Product> index) {
        List<DishTemplate> pool = TEMPLATES.stream()
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
        List<DishTemplate> timely = pool.stream().filter(t -> t.minutes <= maxMinutes).toList();
        List<DishTemplate> source;
        if (timely.isEmpty()) {
            log.warn("No dish within {} min for slot {}, ignoring time limit", maxMinutes, slot);
            source = pool;
        } else {
            List<DishTemplate> timelyUnbanned =
                    timely.stream().filter(t -> !banned.contains(t.dishName)).toList();
            source = timelyUnbanned.isEmpty() ? timely : timelyUnbanned;
        }
        NutritionFacts running = totalOf(picked, index);
        List<DishTemplate> ranked = new ArrayList<>(source);
        ranked.sort(Comparator.comparingDouble(t ->
                shareDistance(running.add(nutritionService.factsFor(t.ingredients(), index)), target)));
        List<DishTemplate> fresh = ranked.stream()
                .filter(t -> !recentlyUsed.contains(t.dishName))
                .filter(t -> !pickedToday.contains(t.dishName))
                .toList();
        List<DishTemplate> choice = fresh.isEmpty()
                ? ranked.stream().filter(t -> !pickedToday.contains(t.dishName)).toList()
                : fresh;
        if (choice.isEmpty()) {
            choice = ranked;
        }
        // Later retry rounds explore wider: top-2, then top-4, then top-6.
        int width = Math.min(2 + round * 2, choice.size());
        return choice.get(Math.abs(day + slotIdx + round) % width).toMeal(slot);
    }

    /** Distance between macro calorie-share profiles (protein/fat/carbs shares sum to ~1). */
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
        if (template.slots.contains(slot)) {
            return true;
        }
        return (slot == MealType.SNACK || slot == MealType.SNACK_2) && template.slots.contains(MealType.SNACK);
    }

    /** Meat, poultry or fish among ingredients (categories from the product DB). */
    private static boolean hasAnimalProtein(DishTemplate template, Map<String, Product> index) {
        for (PlannedIngredient ingredient : template.ingredients) {
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
        texts.add(template.dishName);
        for (PlannedIngredient ingredient : template.ingredients) {
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

    private record DishTemplate(
            String dishName, Set<MealType> slots, int minutes, List<PlannedIngredient> ingredients,
            List<String> steps) {
        DishTemplate(String dishName, MealType slot, int minutes, List<PlannedIngredient> ingredients,
                List<String> steps) {
            this(dishName, Set.of(slot), minutes, ingredients, steps);
        }

        PlannedMeal toMeal(MealType slot) {
            return new PlannedMeal(slot, dishName, minutes, ingredients, steps);
        }
    }

    private static PlannedIngredient ing(String product, double grams) {
        return new PlannedIngredient(product, grams);
    }

    private static final List<DishTemplate> TEMPLATES = List.of(
            new DishTemplate(
                    "Овсянка с бананом и арахисовой пастой",
                    MealType.BREAKFAST,
                    15,
                    List.of(
                            ing("Овсянка (сухая)", 60),
                            ing("Молоко 3.2%", 150),
                            ing("Банан", 100),
                            ing("Арахисовая паста", 20),
                            ing("Мёд", 10)),
                    List.of(
                            "Залейте овсянку молоком и варите 7–10 минут до готовности.",
                            "Нарежьте банан кружочками.",
                            "Выложите кашу в тарелку, добавьте банан, арахисовую пасту и мёд.")),
            new DishTemplate(
                    "Омлет с овощами и хлебом",
                    MealType.BREAKFAST,
                    15,
                    List.of(
                            ing("Яйцо куриное", 150),
                            ing("Молоко 3.2%", 50),
                            ing("Помидор", 100),
                            ing("Перец болгарский", 50),
                            ing("Масло подсолнечное", 5),
                            ing("Хлеб цельнозерновой", 60)),
                    List.of(
                            "Взбейте яйца с молоком и солью.",
                            "Нарежьте овощи, обжарьте 2–3 минуты на масле.",
                            "Залейте овощи яичной смесью, готовьте под крышкой 5 минут.",
                            "Подавайте с хлебом.")),
            new DishTemplate(
                    "Творог с ягодами и мёдом",
                    MealType.BREAKFAST,
                    10,
                    List.of(
                            ing("Творог 5%", 200), ing("Клубника", 100), ing("Мёд", 15), ing("Семена чиа", 10)),
                    List.of(
                            "Выложите творог в тарелку.",
                            "Добавьте ягоды, мёд и семена чиа, перемешайте.")),
            new DishTemplate(
                    "Гречка с молоком и бананом",
                    MealType.BREAKFAST,
                    20,
                    List.of(ing("Гречка (сухая)", 60), ing("Молоко 3.2%", 200), ing("Банан", 80)),
                    List.of(
                            "Отварите гречку в воде 15 минут.",
                            "Слейте воду, добавьте горячее молоко и нарезанный банан.")),
            new DishTemplate(
                    "Яичница с индейкой и овощами",
                    MealType.BREAKFAST,
                    15,
                    List.of(
                            ing("Яйцо куриное", 100),
                            ing("Индейка (филе)", 80),
                            ing("Помидор", 100),
                            ing("Масло подсолнечное", 5),
                            ing("Хлеб ржаной", 40)),
                    List.of(
                            "Нарежьте индейку полосками, обжарьте 5 минут.",
                            "Добавьте помидор, через 2 минуты разбейте яйца.",
                            "Готовьте 4–5 минут, подавайте с хлебом.")),
            new DishTemplate(
                    "Куриная грудка с рисом и овощами",
                    MealType.LUNCH,
                    35,
                    List.of(
                            ing("Куриная грудка (филе)", 150),
                            ing("Рис белый (сухой)", 80),
                            ing("Огурец", 100),
                            ing("Помидор", 100),
                            ing("Масло оливковое", 10)),
                    List.of(
                            "Отварите рис 20 минут.",
                            "Грудку посолите, обжарьте или запеките 20–25 минут.",
                            "Нарежьте овощи, заправьте маслом, подавайте с рисом и грудкой.")),
            new DishTemplate(
                    "Гречка с говядиной",
                    MealType.LUNCH,
                    40,
                    List.of(
                            ing("Гречка (сухая)", 80),
                            ing("Говядина постная", 150),
                            ing("Морковь", 50),
                            ing("Лук репчатый", 50),
                            ing("Масло подсолнечное", 5)),
                    List.of(
                            "Отварите гречку 15–18 минут.",
                            "Говядину нарежьте, тушите с луком и морковью 25 минут.",
                            "Подавайте мясо с гречкой.")),
            new DishTemplate(
                    "Макароны с индейкой в томатном соусе",
                    MealType.LUNCH,
                    30,
                    List.of(
                            ing("Макароны твёрдых сортов (сухие)", 90),
                            ing("Индейка (филе)", 130),
                            ing("Томатная паста", 30),
                            ing("Лук репчатый", 40),
                            ing("Масло подсолнечное", 5),
                            ing("Пармезан", 15)),
                    List.of(
                            "Отварите макароны до готовности.",
                            "Обжарьте индейку с луком 8 минут, добавьте томатную пасту и 100 мл воды.",
                            "Тушите 10 минут, смешайте с макаронами, посыпьте пармезаном.")),
            new DishTemplate(
                    "Треска с картофелем",
                    MealType.LUNCH,
                    30,
                    List.of(
                            ing("Треска", 180),
                            ing("Картофель", 250),
                            ing("Морковь", 50),
                            ing("Масло подсолнечное", 10),
                            ing("Лимон", 10)),
                    List.of(
                            "Отварите картофель 20 минут.",
                            "Треску запеките с морковью 15 минут при 180°C.",
                            "Подавайте с лимоном.")),
            new DishTemplate(
                    "Булгур с куриным бедром",
                    MealType.LUNCH,
                    40,
                    List.of(
                            ing("Булгур", 80),
                            ing("Куриное бедро без кожи", 150),
                            ing("Перец болгарский", 80),
                            ing("Масло подсолнечное", 5)),
                    List.of(
                            "Залейте булгур кипятком 1:2, оставьте под крышкой 20 минут.",
                            "Бедро запеките 30 минут при 190°C.",
                            "Подавайте с нарезанным перцем.")),
            new DishTemplate(
                    "Лосось с овощами",
                    MealType.DINNER,
                    25,
                    List.of(
                            ing("Лосось", 150),
                            ing("Брокколи", 150),
                            ing("Морковь", 50),
                            ing("Масло оливковое", 5),
                            ing("Лимон", 10)),
                    List.of(
                            "Запеките лосось 15–18 минут при 190°C.",
                            "Брокколи и морковь отварите на пару 7 минут.",
                            "Сбрызните маслом и лимоном.")),
            new DishTemplate(
                    "Салат с тунцом",
                    Set.of(MealType.LUNCH, MealType.DINNER),
                    15,
                    List.of(
                            ing("Тунец консервированный в воде", 120),
                            ing("Яйцо куриное", 50),
                            ing("Огурец", 100),
                            ing("Салат листовой", 50),
                            ing("Масло оливковое", 10),
                            ing("Хлеб цельнозерновой", 40)),
                    List.of(
                            "Отварите яйцо вкрутую (9 минут), нарежьте.",
                            "Смешайте тунец, овощи и яйцо, заправьте маслом.",
                            "Подавайте с хлебом.")),
            new DishTemplate(
                    "Куриная грудка с киноа",
                    Set.of(MealType.LUNCH, MealType.DINNER),
                    30,
                    List.of(
                            ing("Куриная грудка (филе)", 130),
                            ing("Киноа", 70),
                            ing("Шпинат", 50),
                            ing("Помидор", 80),
                            ing("Масло оливковое", 5)),
                    List.of(
                            "Отварите киноа 15 минут.",
                            "Грудку обжарьте по 6 минут с каждой стороны.",
                            "Подавайте со шпинатом и помидором.")),
            new DishTemplate(
                    "Омлет с творогом и зеленью",
                    MealType.DINNER,
                    15,
                    List.of(
                            ing("Яйцо куриное", 100),
                            ing("Творог 5%", 100),
                            ing("Шпинат", 40),
                            ing("Хлеб ржаной", 40)),
                    List.of(
                            "Взбейте яйца, смешайте с творогом и шпинатом.",
                            "Готовьте на сковороде под крышкой 6–7 минут.",
                            "Подавайте с хлебом.")),
            new DishTemplate(
                    "Индейка с бататом",
                    Set.of(MealType.LUNCH, MealType.DINNER),
                    35,
                    List.of(
                            ing("Индейка (филе)", 150),
                            ing("Батат", 200),
                            ing("Фасоль стручковая", 100),
                            ing("Масло подсолнечное", 5)),
                    List.of(
                            "Запеките батат дольками 25 минут при 190°C.",
                            "Индейку обжарьте 10–12 минут.",
                            "Фасоль отварите 5 минут, подавайте вместе.")),
            new DishTemplate(
                    "Греческий йогурт с орехами и яблоком",
                    MealType.SNACK,
                    5,
                    List.of(
                            ing("Йогурт греческий 2%", 200),
                            ing("Яблоко", 120),
                            ing("Грецкий орех", 20),
                            ing("Мёд", 10)),
                    List.of(
                            "Нарежьте яблоко.",
                            "Смешайте йогурт с яблоком, добавьте орехи и мёд.")),
            new DishTemplate(
                    "Творог с бананом",
                    MealType.SNACK,
                    5,
                    List.of(ing("Творог 0%", 150), ing("Банан", 100), ing("Какао-порошок", 5)),
                    List.of("Смешайте творог с нарезанным бананом, посыпьте какао.")),
            new DishTemplate(
                    "Бутерброд с индейкой",
                    MealType.SNACK,
                    10,
                    List.of(
                            ing("Хлеб цельнозерновой", 60),
                            ing("Индейка (филе)", 60),
                            ing("Огурец", 50),
                            ing("Салат листовой", 20)),
                    List.of(
                            "Отварите или запеките индейку заранее.",
                            "Соберите бутерброд: хлеб, индейка, огурец, салат.")),
            new DishTemplate(
                    "Кефир с бананом и льном",
                    MealType.SNACK,
                    5,
                    List.of(ing("Кефир 2.5%", 250), ing("Банан", 80), ing("Семена льна", 10)),
                    List.of("Взбейте кефир с бананом в блендере, добавьте семена льна.")),
            new DishTemplate(
                    "Плов с курицей",
                    MealType.LUNCH,
                    40,
                    List.of(
                            ing("Куриное бедро без кожи", 130),
                            ing("Рис белый (сухой)", 90),
                            ing("Морковь", 60),
                            ing("Лук репчатый", 40),
                            ing("Масло подсолнечное", 10)),
                    List.of(
                            "Обжарьте курицу с луком и морковью 8 минут.",
                            "Добавьте рис и 200 мл воды, тушите под крышкой 20 минут.")),
            new DishTemplate(
                    "Паста с курицей и овощами",
                    MealType.LUNCH,
                    25,
                    List.of(
                            ing("Макароны твёрдых сортов (сухие)", 100),
                            ing("Куриная грудка (филе)", 120),
                            ing("Перец болгарский", 80),
                            ing("Томатная паста", 20),
                            ing("Масло подсолнечное", 5),
                            ing("Пармезан", 10)),
                    List.of(
                            "Отварите макароны.",
                            "Обжарьте грудку с перцем 8 минут, добавьте томатную пасту.",
                            "Смешайте с макаронами, посыпьте пармезаном.")),
            new DishTemplate(
                    "Булгур с нутом",
                    MealType.LUNCH,
                    25,
                    List.of(
                            ing("Булгур", 90),
                            ing("Нут (сухой)", 60),
                            ing("Морковь", 50),
                            ing("Масло оливковое", 10),
                            ing("Лимон", 10)),
                    List.of(
                            "Нут замочите на ночь и отварите 40 минут (или возьмите готовый).",
                            "Булгур залейте кипятком на 20 минут.",
                            "Смешайте с нутом и морковью, заправьте маслом и лимоном.")),
            new DishTemplate(
                    "Рис с индейкой и кукурузой",
                    Set.of(MealType.LUNCH, MealType.DINNER),
                    30,
                    List.of(
                            ing("Рис белый (сухой)", 80),
                            ing("Индейка (филе)", 130),
                            ing("Кукуруза", 100),
                            ing("Огурец", 80),
                            ing("Масло подсолнечное", 5)),
                    List.of(
                            "Отварите рис 20 минут.",
                            "Индейку обжарьте 10–12 минут.",
                            "Подавайте с кукурузой и огурцом.")),
            new DishTemplate(
                    "Паста с тунцом",
                    Set.of(MealType.LUNCH, MealType.DINNER),
                    20,
                    List.of(
                            ing("Макароны твёрдых сортов (сухие)", 90),
                            ing("Тунец консервированный в воде", 100),
                            ing("Помидор", 100),
                            ing("Масло оливковое", 10),
                            ing("Пармезан", 10)),
                    List.of(
                            "Отварите макароны.",
                            "Смешайте с тунцом и нарезанным помидором.",
                            "Заправьте маслом, посыпьте пармезаном.")),
            new DishTemplate(
                    "Пшённая каша с тыквой",
                    MealType.BREAKFAST,
                    25,
                    List.of(
                            ing("Пшено", 70), ing("Тыква", 150), ing("Молоко 3.2%", 150), ing("Мёд", 10)),
                    List.of(
                            "Отварите пшено 15 минут.",
                            "Тыкву нарежьте кубиками, добавьте к пшену с молоком.",
                            "Варите ещё 8 минут, добавьте мёд.")),
            new DishTemplate(
                    "Бутерброд с арахисовой пастой и бананом",
                    MealType.SNACK,
                    5,
                    List.of(
                            ing("Хлеб цельнозерновой", 70), ing("Арахисовая паста", 30), ing("Банан", 80)),
                    List.of(
                            "Намажьте хлеб арахисовой пастой.",
                            "Выложите сверху кружочки банана.")),
            new DishTemplate(
                    "Рисовая каша с яблоком",
                    MealType.BREAKFAST,
                    25,
                    List.of(
                            ing("Рис белый (сухой)", 70),
                            ing("Молоко 3.2%", 150),
                            ing("Яблоко", 100),
                            ing("Мёд", 10)),
                    List.of(
                            "Отварите рис в молоке 20 минут.",
                            "Добавьте нарезанное яблоко и мёд.")),
            new DishTemplate(
                    "Гречка с грибами",
                    MealType.DINNER,
                    30,
                    List.of(
                            ing("Гречка (сухая)", 80),
                            ing("Шампиньоны", 150),
                            ing("Лук репчатый", 40),
                            ing("Масло подсолнечное", 10),
                            ing("Сметана 15%", 30)),
                    List.of(
                            "Отварите гречку 15–18 минут.",
                            "Обжарьте грибы с луком 10 минут.",
                            "Подавайте гречку с грибами и сметаной.")),
            new DishTemplate(
                    "Овсяное печенье с кефиром",
                    MealType.SNACK,
                    5,
                    List.of(ing("Печенье овсяное", 60), ing("Кефир 2.5%", 200)),
                    List.of("Подавайте печенье с холодным кефиром.")),
            new DishTemplate(
                    "Креветки с овощами",
                    Set.of(MealType.LUNCH, MealType.DINNER),
                    20,
                    List.of(
                            ing("Креветки", 150),
                            ing("Перец болгарский", 100),
                            ing("Кабачок", 100),
                            ing("Масло оливковое", 5)),
                    List.of(
                            "Обжарьте овощи 5 минут.",
                            "Добавьте креветки, готовьте ещё 4–5 минут.")),
            new DishTemplate(
                    "Творог 0% с клубникой",
                    MealType.SNACK,
                    5,
                    List.of(ing("Творог 0%", 200), ing("Клубника", 100)),
                    List.of("Смешайте творог с ягодами.")),
            new DishTemplate(
                    "Омлет из белков с овощами",
                    MealType.BREAKFAST,
                    15,
                    List.of(
                            ing("Белок яйца", 200),
                            ing("Помидор", 80),
                            ing("Шпинат", 30),
                            ing("Хлеб ржаной", 30)),
                    List.of(
                            "Взбейте белки с солью.",
                            "Добавьте овощи, готовьте под крышкой 5–6 минут.",
                            "Подавайте с хлебом.")),
            new DishTemplate(
                    "Паста с овощами и маслом",
                    Set.of(MealType.LUNCH, MealType.DINNER),
                    20,
                    List.of(
                            ing("Макароны твёрдых сортов (сухие)", 120),
                            ing("Перец болгарский", 80),
                            ing("Кабачок", 80),
                            ing("Масло оливковое", 15),
                            ing("Пармезан", 10)),
                    List.of(
                            "Отварите макароны.",
                            "Овощи обжарьте на масле 6–7 минут.",
                            "Смешайте с макаронами, посыпьте пармезаном.")),
            new DishTemplate(
                    "Орехи с бананом",
                    MealType.SNACK,
                    5,
                    List.of(ing("Миндаль", 30), ing("Банан", 120)),
                    List.of("Выложите миндаль и нарезанный банан на тарелку.")));
}
