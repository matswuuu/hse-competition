package dev.matswuuu.hse.photo;

import dev.matswuuu.hse.photo.dto.PhotoRecognitionResponse;
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

    public record StatusResponse(boolean available) {}
}
