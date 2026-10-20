package dev.matswuuu.hse.scan.dto;

import dev.matswuuu.hse.food.dto.ProductResponse;

/**
 * Result of a product photo. {@code FOUND}: {@code product} is ready to add to the fridge.
 * {@code NEED_LABEL}: the product is unknown — ask for a photo of the composition / nutrition label
 * and a name ({@code suggestedName} prefills it, {@code barcode} is kept with the new product).
 */
public record ProductScanResponse(
        Status status, ProductResponse product, String barcode, String suggestedName, Via via) {

    public enum Status {
        FOUND,
        NEED_LABEL
    }

    /** Where the answer came from. */
    public enum Via {
        BARCODE_LOCAL,
        OPEN_FOOD_FACTS,
        VISION,
        NONE
    }
}
