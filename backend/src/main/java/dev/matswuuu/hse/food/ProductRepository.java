package dev.matswuuu.hse.food;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByNameContainingIgnoreCase(String query);

    List<Product> findByCategoryIgnoreCase(String category);

    @Query("select distinct p.category from Product p order by p.category")
    List<String> findAllCategories();
}
