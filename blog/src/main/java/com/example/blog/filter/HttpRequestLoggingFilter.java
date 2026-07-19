package com.example.blog.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import com.example.blog.util.ClientIpResolver;

import java.io.IOException;
import java.util.Arrays;

/**
 * HTTP 请求日志：记录 method、path、status、耗时、IP，并标记慢请求与错误请求。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class HttpRequestLoggingFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(HttpRequestLoggingFilter.class);

    private static final String[] EXCLUDED_PATHS = {
        "/health", "/health/liveness", "/health/readiness",
        "/swagger-ui", "/v3/api-docs"
    };

    @Value("${security.trusted-proxies:127.0.0.1,::1}")
    private String trustedProxiesConfig;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        String path = httpRequest.getRequestURI();

        if (Arrays.stream(EXCLUDED_PATHS).anyMatch(path::contains)) {
            chain.doFilter(request, response);
            return;
        }

        long startTime = System.currentTimeMillis();
        CachedBodyServletResponse cachedResponse = new CachedBodyServletResponse(httpResponse);
        chain.doFilter(request, cachedResponse);

        long duration = System.currentTimeMillis() - startTime;
        logRequest(httpRequest, cachedResponse.getStatus(), duration);
    }

    private void logRequest(HttpServletRequest request, int status, long duration) {
        String method = request.getMethod();
        String path = request.getRequestURI();
        String queryString = request.getQueryString();
        String clientIp = getClientIp(request);

        StringBuilder logMessage = new StringBuilder();
        logMessage.append(String.format("[HTTP] %s %s", method, path));
        if (queryString != null && !queryString.isEmpty()) {
            logMessage.append("?").append(queryString);
        }
        logMessage.append(String.format(" - Status: %d", status));
        logMessage.append(String.format(" - Duration: %dms", duration));
        logMessage.append(String.format(" - IP: %s", clientIp));
        logger.info(logMessage.toString());

        if (duration > 1000) {
            logger.warn("Slow request detected: {} {} - {}ms", method, path, duration);
        }
        if (status >= 400) {
            logger.warn("Error request: {} {} - Status: {}", method, path, status);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        return ClientIpResolver.resolve(request, trustedProxiesConfig);
    }

    private static class CachedBodyServletResponse extends HttpServletResponseWrapper {
        private int status = HttpServletResponse.SC_OK;

        public CachedBodyServletResponse(HttpServletResponse response) {
            super(response);
        }

        @Override
        public void setStatus(int sc) {
            this.status = sc;
            super.setStatus(sc);
        }

        @Override
        public int getStatus() {
            return status;
        }
    }
}
