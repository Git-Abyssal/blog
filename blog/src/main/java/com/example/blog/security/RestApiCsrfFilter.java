package com.example.blog.security;

import jakarta.servlet.*;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.util.PatternMatchUtils;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Set;
import java.util.HashSet;

/**
 * REST API CSRF 保护：对 POST/PUT/DELETE/PATCH 校验 Origin/Referer，配合 JWT + httpOnly cookie 使用。
 */
@Component
@Profile("!test")
public class RestApiCsrfFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(RestApiCsrfFilter.class);

    private static final List<String> EXEMPT_PATHS = List.of(
        "/api/auth/login",
        "/swagger-ui", "/v3/api-docs"
    );

    private static final List<String> SAFE_METHODS = List.of("GET", "HEAD", "OPTIONS", "TRACE");

    @Value("${cors.allowed-origin-patterns:}")
    private String allowedOriginPatternsConfig;

    private Set<String> allowedOrigins = new HashSet<>();

    @PostConstruct
    public void initializeAllowedOrigins() {
        allowedOrigins.clear();
        String originsConfig = allowedOriginPatternsConfig;
        if (originsConfig != null && !originsConfig.trim().isEmpty()) {
            for (String origin : originsConfig.split(",")) {
                allowedOrigins.add(origin.trim());
            }
        }
        logger.info("CSRF Filter initialized with allowed origins: {}", allowedOrigins);
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        // Keep direct servlet/test initialization compatible; Spring Security uses @PostConstruct.
        initializeAllowedOrigins();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        String path = httpRequest.getRequestURI();
        String method = httpRequest.getMethod();

        if (EXEMPT_PATHS.stream().anyMatch(path::startsWith) || SAFE_METHODS.contains(method)) {
            chain.doFilter(request, response);
            return;
        }

        if (List.of("POST", "PUT", "DELETE", "PATCH").contains(method)) {
            if (!validateCsrfRequest(httpRequest)) {
                logger.warn("CSRF validation failed for {} {} from {}", method, path, getRequestOrigin(httpRequest));
                httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                httpResponse.setContentType("application/json");
                httpResponse.setCharacterEncoding("UTF-8");
                httpResponse.getWriter().write("{\"message\":\"CSRF validation failed. Invalid origin or referer.\"}");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    private boolean validateCsrfRequest(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        String referer = request.getHeader("Referer");
        String host = request.getHeader("Host");

        if ((origin == null || origin.isEmpty()) && (referer == null || referer.isEmpty())) {
            logger.warn("CSRF validation failed: Missing both Origin and Referer headers");
            return false;
        }
        if (origin != null && !origin.isEmpty()) {
            return isAllowedOrigin(origin);
        }
        if (referer != null && !referer.isEmpty()) {
            if (isSameOriginRequest(referer, host, request)) {
                return true;
            }
            return isAllowedOrigin(referer);
        }
        return false;
    }

    private boolean isSameOriginRequest(String referer, String host, HttpServletRequest request) {
        if (host == null || host.isEmpty()) {
            return false;
        }
        try {
            String refererOrigin = extractOriginFromUrl(referer);
            if (refererOrigin == null) {
                return false;
            }
            String requestOrigin = extractOriginFromUrl(request.getScheme() + "://" + host);
            return refererOrigin.equals(requestOrigin);
        } catch (Exception e) {
            logger.debug("Error checking same-origin: {}", e.getMessage());
            return false;
        }
    }

    private boolean isAllowedOrigin(String origin) {
        String normalized = extractOriginFromUrl(origin);
        if (normalized == null) {
            return false;
        }
        for (String allowed : allowedOrigins) {
            if (matchesAllowedOrigin(normalized, allowed)) {
                return true;
            }
        }
        return false;
    }

    private boolean matchesAllowedOrigin(String normalizedOrigin, String allowedOriginPattern) {
        if (allowedOriginPattern == null || allowedOriginPattern.isEmpty()) {
            return false;
        }

        if (PatternMatchUtils.simpleMatch(allowedOriginPattern, normalizedOrigin)) {
            return true;
        }

        if (allowedOriginPattern.endsWith(":*")) {
            String allowedWithoutPortWildcard = allowedOriginPattern.substring(0, allowedOriginPattern.length() - 2);
            String normalizedAllowed = extractOriginFromUrl(allowedWithoutPortWildcard);
            return normalizedAllowed != null && sameSchemeAndHost(normalizedOrigin, normalizedAllowed);
        }

        String normalizedAllowed = extractOriginFromUrl(allowedOriginPattern);
        return normalizedOrigin.equals(normalizedAllowed);
    }

    private boolean sameSchemeAndHost(String origin, String allowedOrigin) {
        try {
            URI originUri = URI.create(origin);
            URI allowedUri = URI.create(allowedOrigin);
            return originUri.getScheme().equals(allowedUri.getScheme())
                    && originUri.getHost().equals(allowedUri.getHost());
        } catch (Exception e) {
            return false;
        }
    }

    /** Extract scheme + host + port from a URL for exact origin comparison. */
    private String extractOriginFromUrl(String url) {
        if (url == null || url.isEmpty()) {
            return null;
        }
        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            int port = uri.getPort();
            if (scheme == null || host == null) {
                return null;
            }
            if (port == -1 || (port == 80 && "http".equals(scheme)) || (port == 443 && "https".equals(scheme))) {
                return scheme + "://" + host;
            }
            return scheme + "://" + host + ":" + port;
        } catch (Exception e) {
            return null;
        }
    }

    private String getRequestOrigin(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin != null) {
            return origin;
        }
        String referer = request.getHeader("Referer");
        return referer != null ? referer : "unknown";
    }
}
