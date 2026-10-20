package dev.matswuuu.hse.food;

public enum ProductSource {
    /** Seeded reference catalog (products.csv); the only products meal plans are built from. */
    CATALOG,
    /** Found by barcode in Open Food Facts and cached here. */
    OPEN_FOOD_FACTS,
    /** Named by a user from a photo of the package label; private to that user. */
    USER
}
