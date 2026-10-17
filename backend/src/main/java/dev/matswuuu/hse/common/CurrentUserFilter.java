package dev.matswuuu.hse.common;

import dev.matswuuu.hse.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Binds the authenticated user to {@link CurrentUser#USER} for the request scope.
 * Runs after Spring Security (default filter order), so the SecurityContext is ready.
 */
@Component
public class CurrentUserFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    public CurrentUserFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            chain.doFilter(request, response);
            return;
        }
        var user = userRepository.findByUsername(auth.getName());
        if (user.isEmpty()) {
            chain.doFilter(request, response);
            return;
        }
        try {
            ScopedValue.where(CurrentUser.USER, user.get()).call(() -> {
                chain.doFilter(request, response);
                return null;
            });
        } catch (ServletException | IOException | RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new ServletException(e);
        }
    }
}
