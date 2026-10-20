package dev.matswuuu.hse.settings;

import dev.matswuuu.hse.common.CurrentUser;
import dev.matswuuu.hse.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {

    private final UserSettingsRepository repository;

    public SettingsService(UserSettingsRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public SettingsDto get() {
        return SettingsDto.from(settingsOf(CurrentUser.get()));
    }

    @Transactional
    public SettingsDto update(SettingsDto request) {
        User user = CurrentUser.get();
        UserSettings settings = repository.findById(user.getId()).orElseGet(() -> new UserSettings(user));
        settings.setUseFridgeInPlanning(request.useFridgeInPlanning());
        return SettingsDto.from(repository.save(settings));
    }

    /** Stored settings, or defaults when the user never changed them (not persisted). */
    @Transactional(readOnly = true)
    public UserSettings settingsOf(User user) {
        return repository.findById(user.getId()).orElseGet(() -> new UserSettings(user));
    }

    public record SettingsDto(boolean useFridgeInPlanning) {

        static SettingsDto from(UserSettings s) {
            return new SettingsDto(s.isUseFridgeInPlanning());
        }
    }
}
