package dev.matswuuu.hse.purchase.dto;

/** {@code duplicate}: this receipt was imported before; the earlier purchase is returned unchanged. */
public record ReceiptImportResponse(PurchaseResponse purchase, boolean duplicate) {}
