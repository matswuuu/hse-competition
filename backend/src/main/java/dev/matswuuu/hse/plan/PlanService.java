package dev.matswuuu.hse.plan;

import dev.matswuuu.hse.analytics.AnalyticsEventType;
import dev.matswuuu.hse.analytics.AnalyticsService;
import dev.matswuuu.hse.common.CurrentUser;
import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.nutrition.DayTargets;
import dev.matswuuu.hse.nutrition.NutritionProperties;
import dev.matswuuu.hse.nutrition.NutritionTarget;
import dev.matswuuu.hse.nutrition.NutritionTargetCalculator;
import dev.matswuuu.hse.plan.dto.DayViewResponse;
import dev.matswuuu.hse.plan.dto.DishCardResponse;
import dev.matswuuu.hse.plan.dto.MealSummaryResponse;
import dev.matswuuu.hse.plan.dto.NutritionFacts;
import dev.matswuuu.hse.plan.dto.ShoppingListResponse;
import dev.matswuuu.hse.plan.dto.WeekResponse;
import dev.matswuuu.hse.plan.gen.DemoMealPlanner;
import dev.matswuuu.hse.plan.gen.MealPlanner;
import dev.matswuuu.hse.plan.gen.PlanContext;
import dev.matswuuu.hse.plan.gen.PlannedDay;
import dev.matswuuu.hse.plan.gen.PlannedIngredient;
import dev.matswuuu.hse.plan.gen.PlannedMeal;
import dev.matswuuu.hse.plan.gen.PlannerException;
import dev.matswuuu.hse.questionnaire.Questionnaire;
import dev.matswuuu.hse.questionnaire.QuestionnaireService;
import dev.matswuuu.hse.user.User;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PlanService {

    private static final Logger log = LoggerFactory.getLogger(PlanService.class);

    private final MealPlanRepository planRepository;
    private final PlanDayRepository dayRepository;
    private final MealEntryRepository mealRepository;
    private final MealIngredientRepository ingredientRepository;
    private final QuestionnaireService questionnaireService;
    private final NutritionTargetCalculator calculator;
    private final PlanNutritionService nutritionService;
    private final NutritionProperties properties;
    private final DemoMealPlanner demoPlanner;
    private final ObjectProvider<MealPlanner> planners;
    private final AnalyticsService analyticsService;

    public PlanService(
            MealPlanRepository planRepository,
            PlanDayRepository dayRepository,
            MealEntryRepository mealRepository,
            MealIngredientRepository ingredientRepository,
            QuestionnaireService questionnaireService,
            NutritionTargetCalculator calculator,
            PlanNutritionService nutritionService,
            NutritionProperties properties,
            DemoMealPlanner demoPlanner,
            ObjectProvider<MealPlanner> planners,
            AnalyticsService analyticsService) {
        this.planRepository = planRepository;
        this.dayRepository = dayRepository;
        this.mealRepository = mealRepository;
        this.ingredientRepository = ingredientRepository;
        this.questionnaireService = questionnaireService;
        this.calculator = calculator;
        this.nutritionService = nutritionService;
        this.properties = properties;
        this.demoPlanner = demoPlanner;
        this.planners = planners;
        this.analyticsService = analyticsService;
    }

    /**
     * Generates a 7-day plan (§4.3): planner proposes dishes, code resolves КБЖУ,
     * verifies tolerance and exclusions, scales portions or retries (max N attempts),
     * falls back to the demo set when the LLM is unavailable.
     */
    @Transactional
    public WeekResponse generate() {
        return generateFor(CurrentUser.get());
    }

    @Transactional
    public WeekResponse generateFor(User user) {
        Questionnaire q = questionnaireService.latestEntityFor(user);
        DayTargets targets = calculator.calculate(
                q.getSex(), q.getAge(), q.getHeightCm(), q.getWeightKg(), q.getActivityLevel(), q.getGoal());
        LocalDate startDate = LocalDate.now();
        long started = System.nanoTime();

        Map<String, Product> index = nutritionService.productIndex();
        Set<String> exclusions = DemoMealPlanner.collectExclusions(q);
        Candidate best = null;
        String usedPlanner = demoPlanner.name();
        boolean fallbackUsed = true;
        Set<String> banned = new HashSet<>();

        outer:
        for (int round = 0; round < properties.getMaxAttempts(); round++) {
            for (MealPlanner planner : orderedPlanners()) {
                List<PlannedDay> days;
                try {
                    days = planner.plan(new PlanContext(q, targets, startDate, round, Set.copyOf(banned)));
                } catch (PlannerException e) {
                    log.warn("Planner {} failed on round {}: {}", planner.name(), round, e.getMessage());
                    continue;
                }
                Candidate candidate = verify(days, targets, exclusions, index);
                if (candidate == null) {
                    continue;
                }
                if (best == null || candidate.deviation() < best.deviation()) {
                    best = candidate;
                    usedPlanner = planner.name();
                    fallbackUsed = planner == demoPlanner;
                }
                if (candidate.deviation() <= properties.getTolerancePct()) {
                    break outer;
                }
                // Force structural variety: ban the worst day's dishes next round.
                int worst = 0;
                for (int i = 1; i < candidate.dayDeviations().length; i++) {
                    if (candidate.dayDeviations()[i] > candidate.dayDeviations()[worst]) {
                        worst = i;
                    }
                }
                for (PlannedMeal meal : candidate.days().get(worst).meals()) {
                    banned.add(meal.dishName());
                }
            }
        }
        if (best == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY, "Could not compose a plan within constraints, adjust exclusions");
        }

        MealPlan plan = new MealPlan();
        plan.setUser(user);
        plan.setStartDate(startDate);
        plan.setFallbackUsed(fallbackUsed);
        plan = planRepository.save(plan);
        for (int i = 0; i < 7; i++) {
            persistDay(plan, i, startDate.plusDays(i), best.days().get(i), targets, index);
        }
        long ms = (System.nanoTime() - started) / 1_000_000;
        plan.setGenerationTimeMs(ms);
        analyticsService.log(
                user,
                AnalyticsEventType.PLAN_GENERATED,
                "planId=%d planner=%s fallback=%s ms=%d".formatted(plan.getId(), usedPlanner, fallbackUsed, ms));
        return weekView(plan);
    }

    @Transactional(readOnly = true)
    public WeekResponse current() {
        return weekView(latestPlan());
    }

    @Transactional(readOnly = true)
    public DayViewResponse day(int dayIndex) {
        MealPlan plan = latestPlan();
        PlanDay day = dayRepository.findByPlanIdOrderByDayIndex(plan.getId()).stream()
                .filter(d -> d.getDayIndex() == dayIndex)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Day not found"));
        return dayView(day);
    }

    @Transactional
    public DishCardResponse dishCard(Long mealId) {
        MealEntry meal = requireOwned(mealId);
        analyticsService.log(
                CurrentUser.get(),
                AnalyticsEventType.DISH_OPENED,
                "mealId=" + mealId);
        return dishCardOf(meal);
    }

    @Transactional
    public DishCardResponse setEaten(Long mealId, boolean eaten) {
        MealEntry meal = requireOwned(mealId);
        meal.setEaten(eaten);
        analyticsService.log(
                CurrentUser.get(),
                AnalyticsEventType.MEAL_EATEN,
                "mealId=%d eaten=%s".formatted(mealId, eaten));
        return dishCardOf(meal);
    }

    /** Replacement with close КБЖУ (±10%) and no excluded products (§4.7, P1). */
    @Transactional
    public DishCardResponse replaceMeal(Long mealId) {
        User user = CurrentUser.get();
        MealEntry meal = requireOwned(mealId);
        Questionnaire q = questionnaireService.latestEntity();
        Set<String> exclusions = DemoMealPlanner.collectExclusions(q);
        int maxMinutes = switch (q.getCookingTime()) {
            case UP_TO_20 -> 20;
            case UP_TO_40 -> 40;
            case ANY -> Integer.MAX_VALUE;
        };
        NutritionFacts current = nutritionService.factsForEntities(ingredientRepository.findByMealId(mealId));
        Map<String, Product> productIndex = nutritionService.productIndex();
        PlannedMeal alt = null;
        for (int seed = 0; seed < 10; seed++) {
            PlannedMeal candidate;
            try {
                candidate = demoPlanner.alternative(
                        meal.getMealType(), exclusions, maxMinutes, meal.getDishName(), seed);
            } catch (PlannerException e) {
                break;
            }
            NutritionFacts base = nutritionService.factsFor(candidate.ingredients(), productIndex);
            if (base.kcal() <= 0 || current.kcal() <= 0) {
                continue;
            }
            PlannedMeal fitted = demoPlanner.fitSingle(candidate, current);
            NutritionFacts fittedFacts = nutritionService.factsFor(fitted.ingredients(), productIndex);
            if (fittedFacts.maxDeviationPct(current) <= 10.0) {
                alt = fitted;
                break;
            }
        }
        if (alt == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No suitable replacement found");
        }
        meal.setDishName(alt.dishName());
        meal.setCookingTimeMin(alt.cookingTimeMin());
        meal.setEaten(false);
        meal.getSteps().clear();
        meal.getSteps().addAll(alt.steps());
        ingredientRepository.deleteAll(ingredientRepository.findByMealId(mealId));
        Map<String, Product> index = nutritionService.productIndex();
        for (PlannedIngredient ingredient : alt.ingredients()) {
            persistIngredient(meal, ingredient, index);
        }
        analyticsService.log(user, AnalyticsEventType.DISH_REPLACED, "mealId=%d dish=%s".formatted(mealId, alt.dishName()));
        return dishCardOf(meal);
    }

    /** Week ingredients aggregated by category with grams (§4.8, P1). */
    @Transactional(readOnly = true)
    public ShoppingListResponse shoppingList() {
        MealPlan plan = latestPlan();
        Map<String, Map<String, Double>> byCategory = new TreeMap<>();
        for (MealIngredient ingredient : ingredientRepository.findByPlanId(plan.getId())) {
            Product product = ingredient.getProduct();
            if (product == null) {
                continue;
            }
            byCategory
                    .computeIfAbsent(product.getCategory(), c -> new TreeMap<>())
                    .merge(product.getName(), ingredient.getGrams(), Double::sum);
        }
        return new ShoppingListResponse(byCategory.entrySet().stream()
                .map(e -> new ShoppingListResponse.CategoryGroup(
                        e.getKey(),
                        e.getValue().entrySet().stream()
                                .map(i -> new ShoppingListResponse.Item(
                                        i.getKey(), Math.round(i.getValue() * 10.0) / 10.0))
                                .toList()))
                .toList());
    }

    // ---- verification ----

    private List<MealPlanner> orderedPlanners() {
        List<MealPlanner> all = new ArrayList<>();
        planners.forEach(all::add);
        all.sort(Comparator.comparing(p -> p == demoPlanner ? 1 : 0));
        return all.stream().filter(MealPlanner::available).toList();
    }

    private record Candidate(List<PlannedDay> days, double deviation, double[] dayDeviations) {}

    /** Returns null when the candidate violates hard constraints (exclusions, unknown products). */
    private Candidate verify(
            List<PlannedDay> days, DayTargets targets, Set<String> exclusions, Map<String, Product> index) {
        if (days == null || days.size() != 7) {
            return null;
        }
        List<PlannedDay> fitted = new ArrayList<>(7);
        double[] deviations = new double[days.size()];
        double worst = 0;
        for (int i = 0; i < days.size(); i++) {
            PlannedDay day = days.get(i);
            if (day.meals() == null || day.meals().isEmpty()) {
                return null;
            }
            for (PlannedMeal meal : day.meals()) {
                if (!ingredientsKnown(meal, index) || mealViolates(meal, exclusions, index)) {
                    return null;
                }
            }
            NutritionTarget target = day.trainingDay() ? targets.trainingDay() : targets.restDay();
            NutritionFacts targetFacts =
                    new NutritionFacts(target.kcal(), target.proteinG(), target.fatG(), target.carbsG());
            NutritionFacts actual = dayTotal(day, index);
            double deviation = actual.maxDeviationPct(targetFacts);
            PlannedDay fittedDay = day;
            if (deviation > properties.getTolerancePct() && actual.kcal() > 0) {
                double factor = clamp(target.kcal() / actual.kcal(), 0.7, 1.3);
                PlannedDay scaled = new PlannedDay(
                        day.trainingDay(), day.meals().stream().map(m -> m.scaled(factor)).toList());
                double scaledDeviation = dayTotal(scaled, index).maxDeviationPct(targetFacts);
                if (scaledDeviation < deviation) {
                    fittedDay = scaled;
                    deviation = scaledDeviation;
                }
            }
            fitted.add(fittedDay);
            deviations[i] = deviation;
            worst = Math.max(worst, deviation);
        }
        return new Candidate(fitted, worst, deviations);
    }

    private boolean ingredientsKnown(PlannedMeal meal, Map<String, Product> index) {
        for (PlannedIngredient ingredient : meal.ingredients()) {
            if (ingredient.grams() <= 0 || nutritionService.resolve(ingredient.productName(), index) == null) {
                return false;
            }
        }
        return !meal.ingredients().isEmpty();
    }

    private boolean mealViolates(PlannedMeal meal, Set<String> exclusions, Map<String, Product> index) {
        if (exclusions.isEmpty()) {
            return false;
        }
        List<String> texts = new ArrayList<>();
        texts.add(meal.dishName());
        for (PlannedIngredient ingredient : meal.ingredients()) {
            texts.add(ingredient.productName());
            Product product = nutritionService.resolve(ingredient.productName(), index);
            if (product != null) {
                texts.add(product.getCategory());
            }
        }
        return ExclusionMatcher.violates(exclusions, texts.toArray(String[]::new));
    }

    private NutritionFacts dayTotal(PlannedDay day, Map<String, Product> index) {
        NutritionFacts total = NutritionFacts.ZERO;
        for (PlannedMeal meal : day.meals()) {
            total = total.add(nutritionService.factsFor(meal.ingredients(), index));
        }
        return total;
    }

    // ---- persistence & views ----

    private void persistDay(
            MealPlan plan, int dayIndex, java.time.LocalDate date, PlannedDay planned, DayTargets targets,
            Map<String, Product> index) {
        NutritionTarget target = planned.trainingDay() ? targets.trainingDay() : targets.restDay();
        PlanDay day = new PlanDay();
        day.setPlan(plan);
        day.setDayIndex(dayIndex);
        day.setDate(date);
        day.setTrainingDay(planned.trainingDay());
        day.setTargetKcal(target.kcal());
        day.setTargetProteinG(target.proteinG());
        day.setTargetFatG(target.fatG());
        day.setTargetCarbsG(target.carbsG());
        day = dayRepository.save(day);
        for (int m = 0; m < planned.meals().size(); m++) {
            PlannedMeal plannedMeal = planned.meals().get(m);
            MealEntry meal = new MealEntry();
            meal.setPlanDay(day);
            meal.setMealType(plannedMeal.mealType());
            meal.setPosition(m);
            meal.setDishName(plannedMeal.dishName());
            meal.setCookingTimeMin(plannedMeal.cookingTimeMin());
            meal.setEaten(false);
            meal.getSteps().addAll(plannedMeal.steps());
            meal = mealRepository.save(meal);
            for (PlannedIngredient ingredient : plannedMeal.ingredients()) {
                persistIngredient(meal, ingredient, index);
            }
        }
    }

    private void persistIngredient(MealEntry meal, PlannedIngredient planned, Map<String, Product> index) {
        MealIngredient ingredient = new MealIngredient();
        ingredient.setMeal(meal);
        ingredient.setProductName(planned.productName());
        ingredient.setProduct(nutritionService.resolve(planned.productName(), index));
        ingredient.setGrams(planned.grams());
        ingredientRepository.save(ingredient);
    }

    private MealPlan latestPlan() {
        User user = CurrentUser.get();
        return planRepository
                .findFirstByUserIdOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No meal plan yet, generate one"));
    }

    private MealEntry requireOwned(Long mealId) {
        User user = CurrentUser.get();
        MealEntry meal = mealRepository
                .findById(mealId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal not found"));
        if (!meal.getPlanDay().getPlan().getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your meal");
        }
        return meal;
    }

    private WeekResponse weekView(MealPlan plan) {
        List<DayViewResponse> days = dayRepository.findByPlanIdOrderByDayIndex(plan.getId()).stream()
                .map(this::dayView)
                .toList();
        return new WeekResponse(plan.getId(), plan.getStartDate(), plan.isFallbackUsed(), plan.getGenerationTimeMs(), days);
    }

    private DayViewResponse dayView(PlanDay day) {
        List<MealEntry> meals = mealRepository.findByDayIdOrdered(day.getId());
        List<MealSummaryResponse> summaries = new ArrayList<>(meals.size());
        NutritionFacts totals = NutritionFacts.ZERO;
        for (MealEntry meal : meals) {
            NutritionFacts facts = nutritionService.factsForEntities(ingredientRepository.findByMealId(meal.getId()));
            totals = totals.add(facts);
            summaries.add(new MealSummaryResponse(
                    meal.getId(), meal.getMealType(), meal.getDishName(), meal.getCookingTimeMin(), meal.isEaten(), facts));
        }
        NutritionFacts targets =
                new NutritionFacts(day.getTargetKcal(), day.getTargetProteinG(), day.getTargetFatG(), day.getTargetCarbsG());
        double deviation = totals.maxDeviationPct(targets);
        return new DayViewResponse(
                day.getId(), day.getDayIndex(), day.getDate(), day.isTrainingDay(), targets, totals,
                deviation <= properties.getTolerancePct(), Math.round(deviation * 10.0) / 10.0, summaries);
    }

    private DishCardResponse dishCardOf(MealEntry meal) {
        List<MealIngredient> ingredients = ingredientRepository.findByMealId(meal.getId());
        NutritionFacts facts = nutritionService.factsForEntities(ingredients);
        return new DishCardResponse(
                meal.getId(),
                meal.getPlanDay().getId(),
                meal.getMealType(),
                meal.getDishName(),
                meal.getCookingTimeMin(),
                meal.isEaten(),
                facts,
                ingredients.stream()
                        .map(i -> new DishCardResponse.IngredientResponse(
                                i.getProductName(),
                                i.getProduct() == null ? null : i.getProduct().getCategory(),
                                i.getGrams(),
                                nutritionService.factsForEntities(List.of(i))))
                        .toList(),
                List.copyOf(meal.getSteps()));
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
