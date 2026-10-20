package dev.matswuuu.hse.plan;

import dev.matswuuu.hse.food.Product;
import dev.matswuuu.hse.food.ProductRepository;
import dev.matswuuu.hse.food.ProductSource;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CatalogMatchTest {

    private final PlanNutritionService service = service();
    private final Map<String, Product> index = service.productIndex();

    @ParameterizedTest(name = "{0} -> {1}")
    @CsvSource(delimiter = '|', nullValues = "null", value = {
            "ГРУДКА КУРИНАЯ ФИЛЕ ОХЛ 1КГ | Куриная грудка (филе)",
            "Молоко Простоквашино 3,2% 930мл | Молоко 3.2%",
            "МОЛОКО ПИТЬЕВОЕ 1.5% 1Л | Молоко 1.5%",
            "БАНАНЫ ВЕС | Банан",
            "Сыр Российский Ламбер 50% | Сыр российский",
            "Гречка ядрица Мистраль 900г | Гречка (сухая)",
            "ПАКЕТ-МАЙКА ПЯТЕРОЧКА | null",
            "Шоколад молочный Alpen Gold | null",
    })
    void matchesReceiptNames(String name, String expected) {
        Product product = service.matchCatalog(name, index);
        assertThat(product == null ? null : product.getName()).isEqualTo(expected);
    }

    private static PlanNutritionService service() {
        ProductRepository products = mock(ProductRepository.class);
        when(products.findBySource(ProductSource.CATALOG)).thenReturn(List.of(
                new Product("Гречка (сухая)", "крупы", 330, 12.6, 3.3, 62.0),
                new Product("Куриная грудка (филе)", "птица", 110, 23.1, 1.2, 0),
                new Product("Молоко 3.2%", "молочные", 60, 3.2, 3.2, 4.8),
                new Product("Молоко 1.5%", "молочные", 45, 3.2, 1.5, 4.8),
                new Product("Сыр российский", "молочные", 360, 24, 29, 0),
                new Product("Банан", "фрукты", 95, 1.5, 0.2, 22),
                new Product("Масло сливочное", "масла", 748, 0.5, 82.5, 0.8)));
        return new PlanNutritionService(products);
    }
}
