package com.example.blog.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.example.blog.util.ClientIpResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * 速率限制过滤器
 * 对敏感操作进行速率限制，防止暴力破解和滥用
 *
 * 按公开入口和站长操作分别限流：
 * - 密码修改：独立计数
 * - 站长操作：基于站长账号限流而非 IP
 */
@Component
@Profile("!test")
public class RateLimitFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitFilter.class);

    @Autowired
    private StringRedisTemplate redisTemplate;

    // 认证相关限流
    @Value("${security.rate-limit.auth-requests-per-minute:10}")
    private int maxAuthRequests;

    // 密码修改限流（独立计数）
    @Value("${security.rate-limit.password-change-per-5min:3}")
    private int maxPasswordChangeRequests;

    // 文章/评论/上传限流
    @Value("${security.rate-limit.article-requests-per-minute:3}")
    private int maxArticleRequests;

    @Value("${security.rate-limit.comment-requests-per-minute:10}")
    private int maxCommentRequests;

    @Value("${security.rate-limit.upload-requests-per-minute:5}")
    private int maxUploadRequests;

    // 站长操作限流
    @Value("${security.rate-limit.owner-operations-per-minute:20}")
    private int maxOwnerOperations;

    // Trusted proxy IPs
    @Value("${security.trusted-proxies:127.0.0.1,::1}")
    private String trustedProxiesConfig;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();
        String method = httpRequest.getMethod();
        String ip = getClientIp(httpRequest);
        String ownerName = getCurrentOwnerName();

        RateLimitResult limitResult = checkRateLimit(path, method, ip, ownerName, httpRequest);

        if (limitResult.shouldLimit) {
            logger.warn("Rate limit exceeded: {} for {} from {}", limitResult.message, path, ip);
            httpResponse.setStatus(429);
            httpResponse.setContentType("application/json;charset=UTF-8");
            httpResponse.setHeader("Retry-After", String.valueOf(limitResult.retryAfter));
            httpResponse.getWriter().write("{\"message\": \"" + limitResult.message + "\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    /**
     * 检查并应用速率限制
     * 返回限流结果对象
     */
    private RateLimitResult checkRateLimit(String path, String method, String ip, String ownerName,
                                         HttpServletRequest request) {
        // 站长登录
        if (path.startsWith("/api/auth/login")) {
            return checkIpLimit(ip, "/api/auth/login", maxAuthRequests, 1,
                    "登录操作太频繁，请稍后再试");
        }

        // 密码修改（独立计数，每5分钟）
        if (path.contains("/change-password")) {
            return checkOwnerLimit(ownerName, "password_change", maxPasswordChangeRequests, 5,
                    "密码修改太频繁，请5分钟后再试", request);
        }

        // 文章创建
        if (path.startsWith("/api/articles") && "POST".equals(method)) {
            return checkOwnerLimit(ownerName, "article_create", maxArticleRequests, 1,
                    "文章发布太频繁，请稍后再试", request);
        }

        // 评论创建
        if (path.startsWith("/api/comments") && "POST".equals(method)) {
            return checkOwnerLimit(ownerName, "comment_create", maxCommentRequests, 1,
                    "评论发布太频繁，请稍后再试", request);
        }

        // 文件上传
        if (path.startsWith("/api/upload") && "POST".equals(method)) {
            return checkOwnerLimit(ownerName, "file_upload", maxUploadRequests, 1,
                    "文件上传太频繁，请稍后再试", request);
        }

        // 站长操作 - 基于账号限流而非 IP
        if (isOwnerOperation(path, method)) {
            return checkOwnerLimit(ownerName, "owner_operations", maxOwnerOperations, 1,
                    "站长操作太频繁，请稍后再试", request);
        }

        return new RateLimitResult(false, "", 0);
    }

    /**
     * 基于IP的限流检查
     */
    private RateLimitResult checkIpLimit(String ip, String operation, int maxRequests,
                                       int timeWindowMinutes, String message) {
        try {
            String key = "rate_limit:ip:" + ip + ":" + operation;
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, timeWindowMinutes, TimeUnit.MINUTES);
            }
            if (count != null && count > maxRequests) {
                return new RateLimitResult(true, message, timeWindowMinutes * 60);
            }
        } catch (Exception e) {
            logger.warn("Rate limit Redis check failed, allowing request: {}", e.getMessage());
        }
        return new RateLimitResult(false, "", 0);
    }

    /**
     * 基于站长账号的限流检查
     * 未认证时回退到请求的客户端 IP 限流
     */
    private RateLimitResult checkOwnerLimit(String ownerName, String operation, int maxRequests,
                                         int timeWindowMinutes, String message, HttpServletRequest request) {
        if (ownerName == null || ownerName.isEmpty()) {
            // 未认证请求按客户端 IP 限流，避免共享同一个计数桶。
            String clientIp = request != null ? getClientIp(request) : "unknown";
            return checkIpLimit(clientIp, operation, maxRequests, timeWindowMinutes, message);
        }

        try {
            String key = "rate_limit:owner:" + ownerName + ":" + operation;
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, timeWindowMinutes, TimeUnit.MINUTES);
            }
            if (count != null && count > maxRequests) {
                return new RateLimitResult(true, message, timeWindowMinutes * 60);
            }
        } catch (Exception e) {
            logger.warn("Rate limit Redis check failed, allowing request: {}", e.getMessage());
        }
        return new RateLimitResult(false, "", 0);
    }

    /**
     * 判断是否为站长操作
     */
    private boolean isOwnerOperation(String path, String method) {
        return (path.startsWith("/api/admin") && !"GET".equals(method)) ||
                (path.startsWith("/api/categories") && !"GET".equals(method)) ||
                (path.startsWith("/api/tags") && !"GET".equals(method));
    }

    /**
     * 获取客户端真实IP
     */
    private String getClientIp(HttpServletRequest request) {
        return ClientIpResolver.resolve(request, trustedProxiesConfig);
    }

    private String getCurrentOwnerName() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.isAuthenticated() ? authentication.getName() : null;
    }

    /**
     * 限流结果对象
     */
    private static class RateLimitResult {
        final boolean shouldLimit;
        final String message;
        final int retryAfter; // 秒

        RateLimitResult(boolean shouldLimit, String message, int retryAfter) {
            this.shouldLimit = shouldLimit;
            this.message = message;
            this.retryAfter = retryAfter;
        }
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        logger.info("RateLimitFilter initialized");
    }

    @Override
    public void destroy() {
        logger.info("RateLimitFilter destroyed");
    }
}
