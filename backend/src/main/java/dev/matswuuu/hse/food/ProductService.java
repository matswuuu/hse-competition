package dev.matswuuu.hse.food;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<Product> list(String search, String category) {
        if (search != null && !search.isBlank()) {
            return productRepository.findByNameContainingIgnoreCase(search.strip());
        }
        if (category != null && !category.isBlank()) {
            return productRepository.findByCategoryIgnoreCase(category.strip());
        }
        return productRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<String> categories() {
        return productRepository.findAllCategories();
    }
}
