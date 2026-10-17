package dev.matswuuu.hse;

import dev.matswuuu.hse.nutrition.NutritionProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@EnableConfigurationProperties(NutritionProperties.class)
@SpringBootApplication
public class HseCompetitionApplication {

    static void main(String[] args) {
        SpringApplication.run(HseCompetitionApplication.class, args);
    }

}
