package dev.matswuuu.hse.demo;

import dev.matswuuu.hse.plan.MealPlanRepository;
import dev.matswuuu.hse.plan.PlanService;
import dev.matswuuu.hse.questionnaire.ActivityLevel;
import dev.matswuuu.hse.questionnaire.CookingTime;
import dev.matswuuu.hse.questionnaire.Goal;
import dev.matswuuu.hse.questionnaire.Questionnaire;
import dev.matswuuu.hse.questionnaire.QuestionnaireRepository;
import dev.matswuuu.hse.questionnaire.Sex;
import dev.matswuuu.hse.user.User;
import dev.matswuuu.hse.user.UserRepository;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Demo account with a ready-made plan for the defense demo (§6). Login: demo / demo1234. */
@Component
@Order(2)
public class DemoSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final QuestionnaireRepository questionnaireRepository;
    private final MealPlanRepository planRepository;
    private final PlanService planService;

    public DemoSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            QuestionnaireRepository questionnaireRepository,
            MealPlanRepository planRepository,
            PlanService planService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.questionnaireRepository = questionnaireRepository;
        this.planRepository = planRepository;
        this.planService = planService;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        User demo = userRepository.findByUsername("demo").orElseGet(() -> {
            User created = userRepository.save(new User("demo", passwordEncoder.encode("demo1234")));
            log.info("Created demo user");
            return created;
        });
        if (questionnaireRepository.findFirstByUserIdOrderByCreatedAtDesc(demo.getId()).isEmpty()) {
            Questionnaire q = new Questionnaire();
            q.setUser(demo);
            q.setSex(Sex.MALE);
            q.setAge(25);
            q.setHeightCm(180);
            q.setWeightKg(80);
            q.setActivityLevel(ActivityLevel.MODERATE);
            q.setTrainingsPerWeek(3);
            q.setTrainingDays(Set.of(1, 3, 5));
            q.setGoal(Goal.GAIN);
            q.setMealsPerDay(4);
            q.setCookingTime(CookingTime.UP_TO_40);
            q.setConsentAgreed(true);
            questionnaireRepository.save(q);
        }
        if (planRepository.findFirstByUserIdOrderByCreatedAtDesc(demo.getId()).isEmpty()) {
            planService.generateFor(demo);
            log.info("Generated demo plan");
        }
    }
}
