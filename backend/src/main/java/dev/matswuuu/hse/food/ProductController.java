package dev.matswuuu.hse.food;

import dev.matswuuu.hse.food.dto.ProductResponse;
import dev.matswuuu.hse.nutrition.NutritionProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final NutritionProperties nutritionProperties;

    public ProductController(ProductService productService, NutritionProperties nutritionProperties) {
        this.productService = productService;
        this.nutritionProperties = nutritionProperties;
    }

    @GetMapping
    public List<ProductResponse> list(
            @RequestParam(required = false) String search, @RequestParam(required = false) String category) {
        return productService.list(search, category);
    }

    @GetMapping("/categories")
    public List<String> categories() {
        return productService.categories();
    }

    /** Data source attribution, must be visible in the UI (§4.4). */
    @GetMapping("/source")
    public SourceResponse source() {
        return new SourceResponse(nutritionProperties.getSourceName(), nutritionProperties.getSourceUrl());
    }

    public record SourceResponse(String name, String url) {}
}
