package dev.matswuuu.hse.settings;

import dev.matswuuu.hse.settings.SettingsService.SettingsDto;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public SettingsDto get() {
        return settingsService.get();
    }

    @PutMapping
    public SettingsDto update(@RequestBody SettingsDto request) {
        return settingsService.update(request);
    }
}
