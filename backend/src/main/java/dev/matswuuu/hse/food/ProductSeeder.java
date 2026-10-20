package dev.matswuuu.hse.food;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/** Seeds the product database from products.csv on first start (§4.4). */
@Component
@Order(1)
public class ProductSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProductSeeder.class);

    private final ProductRepository productRepository;

    public ProductSeeder(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (productRepository.countBySource(ProductSource.CATALOG) > 0) {
            return;
        }
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource("products.csv").getInputStream(), StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            if (header == null) {
                throw new IllegalStateException("products.csv is empty");
            }
            int count = 0;
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                String[] parts = line.split(";", -1);
                productRepository.save(new Product(
                        parts[0].strip(),
                        parts[1].strip(),
                        Double.parseDouble(parts[2]),
                        Double.parseDouble(parts[3]),
                        Double.parseDouble(parts[4]),
                        Double.parseDouble(parts[5])));
                count++;
            }
            log.info("Seeded {} products", count);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to seed products", e);
        }
    }
}
