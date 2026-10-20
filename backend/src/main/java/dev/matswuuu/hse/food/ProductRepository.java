package dev.matswuuu.hse.food;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    /** Reference catalog used for meal planning. */
    List<Product> findBySource(ProductSource source);

    long countBySource(ProductSource source);

    Optional<Product> findByName(String name);

    @Query("""
            select p from Product p
            where (p.owner is null or p.owner.id = :userId)
              and lower(p.name) like lower(concat('%', :query, '%'))
            order by p.source, p.name""")
    List<Product> searchVisible(Long userId, String query);

    @Query("select p from Product p where (p.owner is null or p.owner.id = :userId) and lower(p.category) = lower(:category) order by p.name")
    List<Product> findVisibleByCategory(Long userId, String category);

    @Query("select p from Product p where p.barcode = :barcode and (p.owner is null or p.owner.id = :userId)")
    List<Product> findVisibleByBarcode(Long userId, String barcode);

    @Query("select distinct p.category from Product p where p.source = dev.matswuuu.hse.food.ProductSource.CATALOG order by p.category")
    List<String> findAllCategories();
}
