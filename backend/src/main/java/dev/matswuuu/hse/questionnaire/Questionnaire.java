package dev.matswuuu.hse.questionnaire;

import dev.matswuuu.hse.user.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "questionnaires")
@Builder
@AllArgsConstructor
@Getter
@Setter
public class Questionnaire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Sex sex;

    @Column(nullable = false)
    private int age;

    @Column(name = "height_cm", nullable = false)
    private double heightCm;

    @Column(name = "weight_kg", nullable = false)
    private double weightKg;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_level", nullable = false, length = 15)
    private ActivityLevel activityLevel;

    @Column(name = "trainings_per_week", nullable = false)
    private int trainingsPerWeek;

    /** Training weekdays, 1 = Monday … 7 = Sunday. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "questionnaire_training_days", joinColumns = @JoinColumn(name = "questionnaire_id"))
    @Column(name = "day_of_week")
    private Set<Integer> trainingDays = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Goal goal;

    @Column(name = "meals_per_day", nullable = false)
    private int mealsPerDay;

    /** Excluded product tags. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "questionnaire_excluded_tags", joinColumns = @JoinColumn(name = "questionnaire_id"))
    @Column(name = "tag")
    private Set<String> excludedTags = new HashSet<>();

    /** Free-text dislikes. */
    @Column(name = "excluded_free_text", length = 500)
    private String excludedFreeText;

    @Enumerated(EnumType.STRING)
    @Column(name = "cooking_time", nullable = false, length = 10)
    private CookingTime cookingTime;

    @Column(name = "budget_per_day")
    private BigDecimal budgetPerDay;

    @Column(name = "consent_agreed", nullable = false)
    private boolean consentAgreed;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Questionnaire() {

    }

}
