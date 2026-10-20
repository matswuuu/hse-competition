package dev.matswuuu.hse.scan;

import dev.matswuuu.hse.food.dto.ProductResponse;
import dev.matswuuu.hse.scan.dto.LabelProductRequest;
import dev.matswuuu.hse.scan.dto.ProductScanResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/** Products from photos; images are processed in memory and not stored. */
@RestController
@RequestMapping("/api/products")
public class ProductScanController {

    private final ProductScanService scanService;
    private final VisionClient vision;

    public ProductScanController(ProductScanService scanService, VisionClient vision) {
        this.scanService = scanService;
        this.vision = vision;
    }

    /** Barcode scanning always works; recognition without a barcode needs the vision model. */
    @GetMapping("/scan/status")
    public StatusResponse status() {
        return new StatusResponse(vision.available());
    }

    @PostMapping("/scan")
    public ProductScanResponse scan(@RequestParam("file") MultipartFile file) throws IOException {
        return scanService.scan(file.getBytes(), file.getContentType());
    }

    /** Product named by the user, macros from the label photo (part "label") or typed in. */
    @PostMapping(path = "/custom", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse custom(
            @Valid @RequestPart("product") LabelProductRequest request,
            @RequestPart(name = "label", required = false) MultipartFile label) throws IOException {
        return scanService.createFromLabel(
                request, label == null ? null : label.getBytes(), label == null ? null : label.getContentType());
    }

    public record StatusResponse(boolean visionAvailable) {}
}
