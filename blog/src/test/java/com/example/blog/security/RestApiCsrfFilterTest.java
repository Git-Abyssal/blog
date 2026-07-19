package com.example.blog.security;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RestApiCsrfFilterTest {

    @Test
    void loginRemainsCsrfExempt() throws ServletException, IOException {
        RestApiCsrfFilter filter = new RestApiCsrfFilter();
        ReflectionTestUtils.setField(filter, "allowedOriginPatternsConfig", "");
        filter.init(null);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    @Test
    void allowsGuestCommentFromConfiguredOrigin() throws ServletException, IOException {
        RestApiCsrfFilter filter = new RestApiCsrfFilter();
        ReflectionTestUtils.setField(filter, "allowedOriginPatternsConfig", "https://blog.example.com");
        filter.init(null);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/comments/article/1");
        request.addHeader("Origin", "https://blog.example.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    @Test
    void initializesConfiguredOriginsWithoutServletRegistration() throws ServletException, IOException {
        RestApiCsrfFilter filter = new RestApiCsrfFilter();
        ReflectionTestUtils.setField(filter, "allowedOriginPatternsConfig", "https://blog.example.com");
        filter.initializeAllowedOrigins();

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/articles");
        request.addHeader("Origin", "https://blog.example.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    @Test
    void allowsConfiguredLocalhostPortWildcardOrigins() throws ServletException, IOException {
        RestApiCsrfFilter filter = new RestApiCsrfFilter();
        ReflectionTestUtils.setField(filter, "allowedOriginPatternsConfig", "http://localhost:*");
        filter.init(null);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/articles");
        request.addHeader("Origin", "http://localhost:5173");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }

    @Test
    void rejectsOriginsThatDoNotMatchConfiguredWildcardHost() throws ServletException, IOException {
        RestApiCsrfFilter filter = new RestApiCsrfFilter();
        ReflectionTestUtils.setField(filter, "allowedOriginPatternsConfig", "http://localhost:*");
        filter.init(null);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/articles");
        request.addHeader("Origin", "http://evil.example:5173");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(403, response.getStatus());
    }

    @Test
    void allowsConfiguredSubdomainWildcardOrigins() throws ServletException, IOException {
        RestApiCsrfFilter filter = new RestApiCsrfFilter();
        ReflectionTestUtils.setField(filter, "allowedOriginPatternsConfig", "https://*.example.com");
        filter.init(null);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/articles");
        request.addHeader("Origin", "https://blog.example.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }
}
