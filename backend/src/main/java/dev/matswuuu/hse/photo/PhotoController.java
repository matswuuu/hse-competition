package dev.matswuuu.hse.photo;

import dev.matswuuu.hse.photo.dto.PhotoRecognitionResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/photo")
public class PhotoController {

    private final PhotoRecognitionService recognitionService;

    public PhotoController(PhotoRecognitionService recognitionService) {
        this.recognitionService = recognitionService;
    }

    /** Lets the UI fall back to the sample when no vision model is configured. */
    @GetMapping("/status")
    public StatusResponse status() {
        return new StatusResponse(recognitionService.available());
    }

    /** Calories from a photo (§4.9): the image is processed in memory and not stored. */
    @PostMapping("/recognize")
    public PhotoRecognitionResponse recognize(@RequestParam("file") MultipartFile file) throws IOException {
        return recognitionService.recognize(file.getBytes(), file.getContentType());
    }

    /** Same as {@link #recognize} for a meal described in words: what the user ate instead of the plan. */
    @PostMapping("/describe")
    public PhotoRecognitionResponse describe(@Valid @RequestBody DescribeRequest request) {
        return recognitionService.recognizeText(request.text());
    }

    public record StatusResponse(boolean available) {}

    public record DescribeRequest(@NotBlank @Size(max = 1000) String text) {}
}
