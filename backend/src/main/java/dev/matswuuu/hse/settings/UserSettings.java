package dev.matswuuu.hse.settings;

import dev.matswuuu.hse.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Account-level preferences that the backend acts on (UI-only ones stay on the device). */
@Entity
@Table(name = "user_settings")
@Getter
@Setter
public class UserSettings {

    @Id
    private Long userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    /** Build menus around fridge products that expire soon. */
    @Column(name = "use_fridge_in_planning", nullable = false)
    private boolean useFridgeInPlanning;

    protected UserSettings() {}

    public UserSettings(User user) {
        this.user = user;
    }
}
