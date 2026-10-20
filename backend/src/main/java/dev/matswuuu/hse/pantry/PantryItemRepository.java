package dev.matswuuu.hse.pantry;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PantryItemRepository extends JpaRepository<PantryItem, Long> {

    /** Soonest to expire first, undated last. */
    @Query("select i from PantryItem i where i.user.id = :userId order by i.expiresAt asc nulls last, i.id asc")
    List<PantryItem> findByUserIdOrdered(Long userId);

    @Query("""
            select i from PantryItem i
            where i.user.id = :userId and i.catalogProduct.id = :productId
            order by i.expiresAt asc nulls last, i.id asc""")
    List<PantryItem> findByUserIdAndCatalogProductId(Long userId, Long productId);
}
