package dev.matswuuu.hse.food;

import dev.matswuuu.hse.common.CurrentUser;
import dev.matswuuu.hse.food.dto.ProductResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ProductService {

    private static final int MAX_SEARCH_RESULTS = 50;

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    /** Catalog and scanned products plus the user's own ones. */
    @Transactional(readOnly = true)
    public List<ProductResponse> list(String search, String category) {
        Long userId = CurrentUser.get().getId();
        List<Product> products;
        if (search != null && !search.isBlank()) {
            products = productRepository.searchVisible(userId, search.strip());
        } else if (category != null && !category.isBlank()) {
            products = productRepository.findVisibleByCategory(userId, category.strip());
        } else {
            products = productRepository.findBySource(ProductSource.CATALOG);
        }
        return products.stream().limit(MAX_SEARCH_RESULTS).map(ProductResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<String> categories() {
        return productRepository.findAllCategories();
    }

    /** A product the current user may reference (shared, or their own). */
    @Transactional(readOnly = true)
    public Product requireVisible(Long productId) {
        Product product = productRepository
                .findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        if (product.getOwner() != null && !product.getOwner().getId().equals(CurrentUser.get().getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }
        return product;
    }
}
