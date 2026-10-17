package dev.matswuuu.hse.common;

import dev.matswuuu.hse.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Authenticated user for the current request, bound by {@link CurrentUserFilter}.
 * Virtual-thread friendly: no ThreadLocal, no SecurityContext lookups in business code.
 */
public final class CurrentUser {

    private CurrentUser() {}

    public static final ScopedValue<User> USER = ScopedValue.newInstance();

    public static User get() {
        if (!USER.isBound()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return USER.get();
    }
}
