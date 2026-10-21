package dev.matswuuu.hse.plan;

import dev.matswuuu.hse.analytics.AnalyticsEventType;
import dev.matswuuu.hse.analytics.AnalyticsService;
import dev.matswuuu.hse.common.CurrentUser;
import dev.matswuuu.hse.dish.DishCatalog;
import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.nutrition.DayTargets;
import dev.matswuuu.hse.nutrition.NutritionProperties;
import dev.matswuuu.hse.nutrition.NutritionTarget;
import dev.matswuuu.hse.nutrition.NutritionTargetCalculator;
import dev.matswuuu.hse.pantry.PantryService;
import dev.matswuuu.hse.plan.dto.*;
import dev.matswuuu.hse.plan.gen.*;
import dev.matswuuu.hse.questionnaire.Questionnaire;
import dev.matswuuu.hse.questionnaire.QuestionnaireService;
import dev.matswuuu.hse.settings.SettingsService;
import dev.matswuuu.hse.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class PlanService {

    /** Replacement keeps the meal's calories within this share (§4.7: близкое КБЖУ ±10%). */
    private static final double REPLACEMENT_TOLERANCE = 0.10;

    /** Fridge products expiring within this many days of the plan start are planned first. */
    private static final int FRIDGE_HORIZON_DAYS = 7;

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
    private final DishCatalog dishCatalog;
    private final PantryService pantryService;
    private final SettingsService settingsService;
    private final Duration llmTimeout;

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
            AnalyticsService analyticsService,
            DishCatalog dishCatalog,
            PantryService pantryService,
            SettingsService settingsService,
            @Value("${nutrition.llm.timeout:60s}") Duration llmTimeout) {
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
        this.dishCatalog = dishCatalog;
        this.pantryService = pantryService;
        this.settingsService = settingsService;
        this.llmTimeout = llmTimeout;
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
        Long previousPlanId = planRepository
                .findFirstByUserIdOrderByCreatedAtDesc(user.getId())
                .map(MealPlan::getId)
                .orElse(null);
        if (previousPlanId != null) {
            log.info("User {} is regenerating plan (previous planId={})", user.getId(), previousPlanId);
        } else {
            log.info("User {} is generating first plan", user.getId());
        }

        Map<String, Product> index = nutritionService.productIndex();
        Set<String> exclusions = DemoMealPlanner.collectExclusions(q);
        List<FridgeStock> fridge = settingsService.settingsOf(user).isUseFridgeInPlanning()
                ? pantryService.expiringStock(user, startDate, FRIDGE_HORIZON_DAYS)
                : List.of();
        if (!fridge.isEmpty()) {
            log.info("User {} plans around {} expiring fridge products", user.getId(), fridge.size());
        }
        Candidate best = null;
        String usedPlanner = demoPlanner.name();
        boolean fallbackUsed = true;
        Set<String> banned = new HashSet<>();
        Set<MealPlanner> timedOut = new HashSet<>();
        Instant deadline = Instant.now().plus(llmTimeout);

        outer:
        for (int round = 0; round < properties.getMaxAttempts(); round++) {
            for (MealPlanner planner : orderedPlanners()) {
                if (timedOut.contains(planner)) {
                    continue;
                }
                List<PlannedDay> days;
                long plannerStarted = System.nanoTime();
                try {
                    days = planner.plan(new PlanContext(q, targets, startDate, round, Set.copyOf(banned), deadline, fridge));
                } catch (PlannerTimeoutException e) {
                    timedOut.add(planner);
                    log.warn("Planner {} timed out for user {} on round {} after {} ms, skipping it for this plan: {}",
                            planner.name(), user.getId(), round, elapsedMs(plannerStarted), e.getMessage());
                    continue;
                } catch (PlannerException e) {
                    log.warn("Planner {} failed for user {} on round {} after {} ms: {}",
                            planner.name(), user.getId(), round, elapsedMs(plannerStarted), e.getMessage());
                    continue;
                }
                Candidate candidate = verify(days, targets, exclusions, index);
                if (candidate == null) {
                    log.warn("Planner {} produced a plan violating constraints for user {} on round {}",
                            planner.name(), user.getId(), round);
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
            log.warn("Plan generation failed for user {}: no candidate within constraints", user.getId());
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
        log.info(
                "Generated planId={} for user {} (previous planId={}, planner={}, fallback={}, deviation={}%, {} ms)",
                plan.getId(), user.getId(), previousPlanId, usedPlanner, fallbackUsed,
                Math.round(best.deviation() * 10.0) / 10.0, ms);
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
        return dayView(requireDay(dayIndex));
    }

    /**
     * Brings a manually edited day back to its target: the user's own meals and eaten ones stay as they are,
     * the remaining planned meals get their portions refitted to what the day still needs.
     * The change is kept only when it brings the day closer to the target.
     */
    @Transactional
    public DayViewResponse rebalanceDay(int dayIndex) {
        User user = CurrentUser.get();
        PlanDay day = requireDay(dayIndex);
        List<MealEntry> meals = mealRepository.findByDayIdOrdered(day.getId());
        if (meals.stream().noneMatch(MealEntry::isCustom)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The day was not edited manually");
        }
        NutritionFacts fixed = NutritionFacts.ZERO;
        List<MealEntry> adjustable = new ArrayList<>();
        List<PlannedMeal> planned = new ArrayList<>();
        for (MealEntry meal : meals) {
            List<MealIngredient> ingredients = ingredientRepository.findByMealId(meal.getId());
            if (isAdjustable(meal)) {
                adjustable.add(meal);
                planned.add(new PlannedMeal(meal.getMealType(), meal.getDishName(), meal.getCookingTimeMin(),
                        ingredients.stream().map(i -> new PlannedIngredient(i.getProductName(), i.getGrams())).toList(),
                        List.copyOf(meal.getSteps())));
            } else {
                fixed = fixed.add(nutritionService.factsForEntities(ingredients));
            }
        }
        if (adjustable.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No planned meals left to adjust");
        }

        Map<String, Product> index = nutritionService.productIndex();
        NutritionFacts target = targetOf(day);
        NutritionFacts remaining = new NutritionFacts(
                Math.max(target.kcal() - fixed.kcal(), 0),
                Math.max(target.proteinG() - fixed.proteinG(), 0),
                Math.max(target.fatG() - fixed.fatG(), 0),
                Math.max(target.carbsG() - fixed.carbsG(), 0));
        NutritionFacts current = NutritionFacts.ZERO;
        for (PlannedMeal meal : planned) {
            current = current.add(nutritionService.factsFor(meal.ingredients(), index));
        }
        double before = fixed.add(current).maxDeviationPct(target);
        // A rough calorie scale first: per-ingredient fitting only moves each portion within bounded steps.
        double factor = current.kcal() > 0 ? clamp(remaining.kcal() / current.kcal(), 0.5, 1.5) : 1.0;
        List<PlannedMeal> fitted = demoPlanner.fitMeals(planned.stream().map(m -> m.scaled(factor)).toList(), remaining);
        NutritionFacts fittedFacts = NutritionFacts.ZERO;
        for (PlannedMeal meal : fitted) {
            fittedFacts = fittedFacts.add(nutritionService.factsFor(meal.ingredients(), index));
        }
        double after = fixed.add(fittedFacts).maxDeviationPct(target);
        if (after >= before) {
            log.info("Rebalancing day {} for user {} found nothing better (deviation {}%)",
                    dayIndex, user.getId(), Math.round(before * 10.0) / 10.0);
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Could not get closer to the target");
        }

        for (int m = 0; m < adjustable.size(); m++) {
            MealEntry meal = adjustable.get(m);
            ingredientRepository.deleteAll(ingredientRepository.findByMealId(meal.getId()));
            for (PlannedIngredient ingredient : fitted.get(m).ingredients()) {
                persistIngredient(meal, ingredient, index);
            }
        }
        log.info("Rebalanced day {} for user {}: {} meals adjusted, deviation {}% -> {}%",
                dayIndex, user.getId(), adjustable.size(),
                Math.round(before * 10.0) / 10.0, Math.round(after * 10.0) / 10.0);
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
        if (meal.isEaten() != eaten && !meal.isCustom()) {
            // Eating uses up what is in the fridge; un-marking puts it back. Own meals were not cooked from it.
            List<MealIngredient> ingredients = ingredientRepository.findByMealId(mealId);
            if (eaten) {
                pantryService.consume(CurrentUser.get(), ingredients);
            } else {
                pantryService.restore(CurrentUser.get(), ingredients);
            }
        }
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
        // What the day still needs once this meal is removed: the replacement is fitted to it,
        // so the day total stays on target while the other meals keep their portions.
        PlanDay day = meal.getPlanDay();
        NutritionFacts dayTarget = new NutritionFacts(
                day.getTargetKcal(), day.getTargetProteinG(), day.getTargetFatG(), day.getTargetCarbsG());
        NutritionFacts others = NutritionFacts.ZERO;
        for (MealEntry other : mealRepository.findByDayIdOrdered(day.getId())) {
            if (!other.getId().equals(mealId)) {
                others = others.add(nutritionService.factsForEntities(ingredientRepository.findByMealId(other.getId())));
            }
        }
        NutritionFacts remaining = new NutritionFacts(
                Math.max(dayTarget.kcal() - others.kcal(), 0),
                Math.max(dayTarget.proteinG() - others.proteinG(), 0),
                Math.max(dayTarget.fatG() - others.fatG(), 0),
                Math.max(dayTarget.carbsG() - others.carbsG(), 0));
        // Never make the day worse than it already is.
        double allowedDayDeviation =
                Math.max(properties.getTolerancePct(), others.add(current).maxDeviationPct(dayTarget));

        PlannedMeal alt = null;
        double bestDeviation = Double.MAX_VALUE;
        for (PlannedMeal candidate : demoPlanner.alternatives(
                meal.getMealType(), exclusions, maxMinutes, meal.getDishName())) {
            NutritionFacts base = nutritionService.factsFor(candidate.ingredients(), productIndex);
            if (base.kcal() <= 0 || current.kcal() <= 0) {
                continue;
            }
            // Templates are base portions while planned meals are scaled to the day, so match
            // kcal first; per-ingredient fitting (bounded factors) then tunes the macros.
            PlannedMeal fitted = demoPlanner.fitSingle(candidate.scaled(current.kcal() / base.kcal()), remaining);
            NutritionFacts fittedFacts = nutritionService.factsFor(fitted.ingredients(), productIndex);
            double dayDeviation = others.add(fittedFacts).maxDeviationPct(dayTarget);
            boolean kcalClose = Math.abs(fittedFacts.kcal() - current.kcal()) <= current.kcal() * REPLACEMENT_TOLERANCE;
            if (kcalClose && dayDeviation <= allowedDayDeviation && dayDeviation < bestDeviation) {
                alt = fitted;
                bestDeviation = dayDeviation;
            }
        }
        if (alt == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No suitable replacement found");
        }
        meal.setDishName(alt.dishName());
        meal.setCookingTimeMin(alt.cookingTimeMin());
        meal.setEaten(false);
        meal.setCustom(false);
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

    /**
     * The user's own meal in place of the planned one (recognized from a photo or a description).
     * КБЖУ is recomputed from the product DB; foods not in it are kept for display but not counted.
     * Day totals and deviation follow automatically, as they are always computed from the meals.
     */
    @Transactional
    public DishCardResponse replaceWithCustom(Long mealId, CustomMealRequest request) {
        User user = CurrentUser.get();
        MealEntry meal = requireOwned(mealId);
        List<MealIngredient> previous = ingredientRepository.findByMealId(mealId);
        if (meal.isEaten() && !meal.isCustom()) {
            // The planned dish was not eaten after all: give its products back to the fridge.
            pantryService.restore(user, previous);
        }
        ingredientRepository.deleteAll(previous);

        meal.setDishName(request.dishName().strip());
        meal.setCookingTimeMin(0);
        meal.getSteps().clear();
        meal.setCustom(true);
        meal.setEaten(request.eaten());
        Map<String, Product> index = nutritionService.productIndex();
        int matched = 0;
        for (CustomMealRequest.Item item : request.items()) {
            Product product = item.productName() == null || item.productName().isBlank()
                    ? null
                    : nutritionService.resolve(item.productName(), index);
            MealIngredient ingredient = new MealIngredient();
            ingredient.setMeal(meal);
            ingredient.setProductName(product == null ? item.name().strip() : product.getName());
            ingredient.setProduct(product);
            ingredient.setGrams(Math.round(item.grams()));
            ingredientRepository.save(ingredient);
            if (product != null) {
                matched++;
            }
        }
        log.info("User {} replaced mealId={} with own meal ({} items, {} matched, eaten={})",
                user.getId(), mealId, request.items().size(), matched, request.eaten());
        analyticsService.log(user, AnalyticsEventType.DISH_REPLACED,
                "mealId=%d custom=true dish=%s".formatted(mealId, meal.getDishName()));
        return dishCardOf(meal);
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

    /** The user's latest plan; 404 when none was generated yet. */
    public MealPlan latestPlan() {
        User user = CurrentUser.get();
        return planRepository
                .findFirstByUserIdOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No meal plan yet, generate one"));
    }

    private PlanDay requireDay(int dayIndex) {
        MealPlan plan = latestPlan();
        return dayRepository.findByPlanIdOrderByDayIndex(plan.getId()).stream()
                .filter(d -> d.getDayIndex() == dayIndex)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Day not found"));
    }

    /** Rebalancing touches only planned meals not eaten yet. */
    private static boolean isAdjustable(MealEntry meal) {
        return !meal.isCustom() && !meal.isEaten();
    }

    private static NutritionFacts targetOf(PlanDay day) {
        return new NutritionFacts(day.getTargetKcal(), day.getTargetProteinG(), day.getTargetFatG(), day.getTargetCarbsG());
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
        return new WeekResponse(
                plan.getId(), plan.getStartDate(), plan.isFallbackUsed(), plan.getGenerationTimeMs(), days,
                fridgeProductsIn(plan));
    }

    private List<String> fridgeProductsIn(MealPlan plan) {
        LocalDate today = LocalDate.now();
        Map<Long, Double> stock = pantryService.stockByCatalogProduct(plan.getUser(), today);
        Set<String> used = new TreeSet<>();
        for (MealIngredient ingredient : ingredientRepository.findByPlanId(plan.getId())) {
            Product product = ingredient.getProduct();
            if (product != null && stock.containsKey(product.getId()) && !ingredient.getMeal().isEaten()
                    && !ingredient.getMeal().getPlanDay().getDate().isBefore(today)) {
                used.add(product.getName());
            }
        }
        return List.copyOf(used);
    }

    private DayViewResponse dayView(PlanDay day) {
        List<MealEntry> meals = mealRepository.findByDayIdOrdered(day.getId());
        List<MealSummaryResponse> summaries = new ArrayList<>(meals.size());
        NutritionFacts totals = NutritionFacts.ZERO;
        for (MealEntry meal : meals) {
            NutritionFacts facts = nutritionService.factsForEntities(ingredientRepository.findByMealId(meal.getId()));
            totals = totals.add(facts);
            summaries.add(new MealSummaryResponse(
                    meal.getId(), meal.getMealType(), meal.getDishName(), meal.getCookingTimeMin(), meal.isEaten(),
                    meal.isCustom(), facts));
        }
        NutritionFacts targets = targetOf(day);
        double deviation = totals.maxDeviationPct(targets);
        boolean withinTolerance = deviation <= properties.getTolerancePct();
        // Offered only for a day the user edited by hand that went off target and still has meals to adjust.
        boolean rebalanceAvailable = !withinTolerance
                && meals.stream().anyMatch(MealEntry::isCustom)
                && meals.stream().anyMatch(PlanService::isAdjustable);
        return new DayViewResponse(
                day.getId(), day.getDayIndex(), day.getDate(), day.isTrainingDay(), targets, totals,
                withinTolerance, Math.round(deviation * 10.0) / 10.0, summaries, rebalanceAvailable);
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
                meal.isCustom(),
                facts,
                ingredients.stream()
                        .map(i -> new DishCardResponse.IngredientResponse(
                                i.getProductName(),
                                i.getProduct() == null ? null : i.getProduct().getCategory(),
                                i.getGrams(),
                                i.getProduct() == null ? null : nutritionService.factsForEntities(List.of(i))))
                        .toList(),
                List.copyOf(meal.getSteps()),
                dishCatalog.recipeUrls(meal.getDishName()));
    }

    private static long elapsedMs(long startedNanos) {
        return (System.nanoTime() - startedNanos) / 1_000_000;
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
