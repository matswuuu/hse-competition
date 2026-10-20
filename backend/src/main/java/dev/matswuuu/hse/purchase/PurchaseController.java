package dev.matswuuu.hse.purchase;

import dev.matswuuu.hse.purchase.dto.ManualPurchaseRequest;
import dev.matswuuu.hse.purchase.dto.PurchaseResponse;
import dev.matswuuu.hse.purchase.dto.ReceiptImportResponse;
import dev.matswuuu.hse.purchase.dto.SpendingResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/purchases")
public class PurchaseController {

    private final PurchaseService purchaseService;

    public PurchaseController(PurchaseService purchaseService) {
        this.purchaseService = purchaseService;
    }

    @GetMapping("/status")
    public StatusResponse status() {
        return new StatusResponse(purchaseService.receiptsAvailable());
    }

    /** Receipt from a photo of its QR code; the photo is not stored. */
    @PostMapping("/receipt")
    public ReceiptImportResponse receiptPhoto(@RequestParam("file") MultipartFile file) throws IOException {
        return purchaseService.importReceiptPhoto(file.getBytes());
    }

    /** Receipt from the QR text (scanned by the device or typed from the receipt). */
    @PostMapping("/receipt/qr")
    public ReceiptImportResponse receiptQr(@Valid @RequestBody QrRequest request) {
        return purchaseService.importReceiptQr(request.qrRaw());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PurchaseResponse addManual(@Valid @RequestBody ManualPurchaseRequest request) {
        return purchaseService.addManual(request);
    }

    /** Latest 50 purchases. */
    @GetMapping
    public List<PurchaseResponse> recent() {
        return purchaseService.recent();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        purchaseService.delete(id);
    }

    @GetMapping("/spending")
    public SpendingResponse spending(@RequestParam(defaultValue = "WEEK") SpendingResponse.Period period) {
        return purchaseService.spending(period);
    }

    public record StatusResponse(boolean receiptsAvailable) {}

    public record QrRequest(@NotBlank @Size(max = 500) String qrRaw) {}
}
