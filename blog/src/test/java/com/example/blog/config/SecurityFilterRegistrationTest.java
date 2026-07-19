package com.example.blog.config;

import com.example.blog.security.FirstLoginPasswordChangeFilter;
import com.example.blog.security.JwtAuthenticationFilter;
import com.example.blog.security.RateLimitFilter;
import com.example.blog.security.RestApiCsrfFilter;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;

class SecurityFilterRegistrationTest {

    private final SecurityConfig config = new SecurityConfig();

    @Test
    void securityFiltersAreNotRegisteredTwiceWithTheServletContainer() {
        assertFalse(config.jwtFilterRegistration(new JwtAuthenticationFilter()).isEnabled());
        assertFalse(config.rateLimitFilterRegistration(new RateLimitFilter()).isEnabled());
        assertFalse(config.firstLoginFilterRegistration(new FirstLoginPasswordChangeFilter()).isEnabled());
        assertFalse(config.csrfFilterRegistration(new RestApiCsrfFilter()).isEnabled());
    }
}
