package com.example.blog.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.blog.entity.AuditLogEntry;
import com.example.blog.mapper.AuditLogMapper;
import com.example.blog.util.ClientIpResolver;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * 审计日志服务
 *
 * 记录敏感操作：
 * - 谁执行了操作（用户名/IP）
 * - 何时执行（时间戳）
 * - 执行了什么操作（操作类型/描述）
 * - 操作参数（可选）
 * - 操作结果（可选）
 */
@Aspect
@Component
public class AuditLogService {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogService.class);

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${security.trusted-proxies:127.0.0.1,::1}")
    private String trustedProxiesConfig;

    @Autowired
    private AuditLogMapper auditLogMapper;

    /**
     * Comprehensive list of sensitive field names that should be redacted from audit logs.
     * This includes authentication credentials, tokens, and personal identifiable information.
     */
    private static final Set<String> SENSITIVE_FIELDS = new HashSet<>(Arrays.asList(
            // Authentication related
            "password", "currentpassword", "newpassword", "oldpassword", "confirmpassword",
            "secret", "token", "accesstoken", "refreshtoken",
            "jwt", "bearer", "authorization",
            // Personal information
            "ssn", "socialsecuritynumber", "creditcard", "cvv",
            "pin", "otp", "totp",
            // API keys
            "apikey", "apisecret", "privatekey", "secretkey",
            // Session related
            "sessionid", "sessiontoken"
    ));

    @Around("@annotation(auditLog)")
    public Object logAudit(ProceedingJoinPoint joinPoint, AuditLog auditLog) throws Throwable {
        long startTime = System.currentTimeMillis(); // 记录开始时间

        HttpServletRequest request = getCurrentRequest();
        String username = getCurrentUsername(request);
        String ipAddress = getClientIp(request);
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

        // 构建审计日志
        Map<String, Object> auditEntry = new HashMap<>();
        auditEntry.put("startTime", startTime); // 用于计算执行时长
        auditEntry.put("timestamp", timestamp);
        auditEntry.put("action", auditLog.action());
        auditEntry.put("description", auditLog.description());
        auditEntry.put("username", username);
        auditEntry.put("ipAddress", ipAddress);
        auditEntry.put("userAgent", request != null ? request.getHeader("User-Agent") : "N/A");
        auditEntry.put("httpMethod", request != null ? request.getMethod() : "N/A");
        auditEntry.put("requestPath", request != null ? request.getRequestURI() : "N/A");
        auditEntry.put("method", joinPoint.getSignature().getName());
        auditEntry.put("class", joinPoint.getTarget().getClass().getSimpleName());

        // 记录参数（如果启用）
        if (auditLog.logParameters()) {
            try {
                Object[] args = joinPoint.getArgs();
                // 过滤敏感参数
                Object[] sanitizedArgs = sanitizeArguments(args);
                auditEntry.put("parameters", Arrays.toString(sanitizedArgs));
            } catch (Exception e) {
                logger.warn("Failed to serialize method parameters", e);
            }
        }

        Object result = null;
        try {
            // 执行方法
            result = joinPoint.proceed();

            // 记录结果（如果启用）
            if (auditLog.logResult() && result != null) {
                try {
                    auditEntry.put("result", sanitizeResult(result));
                } catch (Exception e) {
                    logger.warn("Failed to serialize method result", e);
                }
            }

            auditEntry.put("status", "SUCCESS");

        } catch (Exception e) {
            auditEntry.put("status", "FAILURE");
            auditEntry.put("error", e.getClass().getSimpleName() + ": " + e.getMessage());
            throw e;
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            auditEntry.put("durationMs", duration);
            // 记录审计日志
            try {
                String auditJson = objectMapper.writeValueAsString(auditEntry);
                logger.info("[AUDIT] {}", auditJson);
            } catch (Exception e) {
                logger.error("Failed to write audit log", e);
            }
            persistAuditEntry(auditEntry);
        }

        return result;
    }

    /**
     * 获取当前请求
     */
    private HttpServletRequest getCurrentRequest() {
        ServletRequestAttributes attributes =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getRequest() : null;
    }

    /**
     * 获取当前用户名
     */
    private String getCurrentUsername(HttpServletRequest request) {
        if (request == null) {
            return "SYSTEM";
        }

        // 尝试从请求属性获取认证信息
        Object principal = request.getAttribute("principal");
        if (principal instanceof String) {
            return (String) principal;
        }

        // 尝试从 Spring Security 获取
        org.springframework.security.core.Authentication auth =
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() != null) {
            return auth.getName();
        }

        return "ANONYMOUS";
    }

    /**
     * 获取客户端真实 IP
     */
    private String getClientIp(HttpServletRequest request) {
        return ClientIpResolver.resolve(request, trustedProxiesConfig);
    }

    public void recordLoginAttempt(String username, HttpServletRequest request, boolean success, String errorMessage) {
        Map<String, Object> auditEntry = new HashMap<>();
        auditEntry.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        auditEntry.put("action", "LOGIN");
        auditEntry.put("description", success ? "Owner login succeeded" : "Owner login failed");
        auditEntry.put("username", username);
        auditEntry.put("ipAddress", getClientIp(request));
        auditEntry.put("userAgent", request != null ? request.getHeader("User-Agent") : "N/A");
        auditEntry.put("httpMethod", request != null ? request.getMethod() : "N/A");
        auditEntry.put("requestPath", request != null ? request.getRequestURI() : "N/A");
        auditEntry.put("status", success ? "SUCCESS" : "FAILURE");
        auditEntry.put("error", errorMessage);
        auditEntry.put("class", "AuthController");
        auditEntry.put("method", "login");
        auditEntry.put("durationMs", 0L);
        persistAuditEntry(auditEntry);
    }

    private void persistAuditEntry(Map<String, Object> auditEntry) {
        try {
            AuditLogEntry entry = new AuditLogEntry();
            entry.setTimestamp(LocalDateTime.parse(String.valueOf(auditEntry.get("timestamp"))));
            entry.setAction(truncate(stringValue(auditEntry.get("action")), 100));
            entry.setDescription(truncate(stringValue(auditEntry.get("description")), 500));
            entry.setUsername(truncate(stringValue(auditEntry.get("username")), 100));
            entry.setIpAddress(truncate(stringValue(auditEntry.get("ipAddress")), 50));
            entry.setUserAgent(truncate(stringValue(auditEntry.get("userAgent")), 500));
            entry.setHttpMethod(truncate(stringValue(auditEntry.get("httpMethod")), 10));
            entry.setRequestPath(truncate(stringValue(auditEntry.get("requestPath")), 500));
            entry.setParameters(stringValue(auditEntry.get("parameters")));
            entry.setResult(truncate(stringValue(auditEntry.get("result")), 1000));
            entry.setStatus(truncate(stringValue(auditEntry.get("status")), 20));
            entry.setErrorMessage(truncate(stringValue(auditEntry.get("error")), 1000));
            entry.setClassName(truncate(stringValue(auditEntry.get("class")), 100));
            entry.setMethodName(truncate(stringValue(auditEntry.get("method")), 100));
            entry.setDurationMs((Long) auditEntry.get("durationMs"));
            auditLogMapper.insert(entry);
        } catch (Exception e) {
            logger.error("Failed to persist audit log", e);
        }
    }

    private String stringValue(Object value) {
        return value != null ? String.valueOf(value) : null;
    }

    private String truncate(String value, int maxLength) {
        return value != null && value.length() > maxLength ? value.substring(0, maxLength) : value;
    }

    /**
     * Sanitize method arguments to remove sensitive data before logging.
     *
     * This method checks both parameter names (if available) and values
     * to prevent logging of sensitive information like passwords, tokens, etc.
     *
     * @param args Original method arguments
     * @return Sanitized arguments with sensitive data redacted
     */
    private Object[] sanitizeArguments(Object[] args) {
        if (args == null) {
            return new Object[0];
        }

        Object[] sanitized = new Object[args.length];
        for (int i = 0; i < args.length; i++) {
            sanitized[i] = sanitizeArgument(args[i]);
        }
        return sanitized;
    }

    /**
     * Sanitize a single argument by checking for sensitive data.
     */
    private Object sanitizeArgument(Object arg) {
        if (arg == null) {
            return null;
        }

        // Check if it's a String that might contain sensitive data
        if (arg instanceof String) {
            String str = (String) arg;
            // Only redact if the string value itself looks like sensitive data
            // (not just containing the word "password" as a substring)
            if (isSensitiveValue(str)) {
                return "***REDACTED***";
            }
            return arg;
        }

        // Check if it's an object with sensitive fields
        return sanitizeObject(arg);
    }

    /**
     * Sanitize an object by checking its fields for sensitive data.
     */
    private Object sanitizeObject(Object obj) {
        if (obj == null) {
            return null;
        }

        // Don't try to reflect on system classes
        String className = obj.getClass().getName();
        if (className.startsWith("java.") || className.startsWith("javax.") || className.startsWith("jakarta.")) {
            return obj;
        }

        try {
            // Check if any field name is sensitive
            for (Field field : obj.getClass().getDeclaredFields()) {
                if (SENSITIVE_FIELDS.contains(field.getName().toLowerCase())) {
                    return "***REDACTED*** (contains sensitive fields)";
                }
            }
        } catch (Exception e) {
            logger.debug("Failed to check object fields for sensitive data", e);
        }

        return obj;
    }

    /**
     * Check if a string value appears to be sensitive data.
     * This is more sophisticated than just checking if it contains keywords.
     *
     * @param value The string value to check
     * @return true if the value appears to be sensitive
     */
    private boolean isSensitiveValue(String value) {
        if (value == null || value.isEmpty()) {
            return false;
        }

        String lowerValue = value.toLowerCase();

        // Check if the value itself is a token/Bearer (not just containing the word)
        if (lowerValue.startsWith("bearer ") || lowerValue.startsWith("token ")) {
            return true;
        }

        // JWT tokens are typically long strings with dots
        if (lowerValue.matches("^[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+$")) {
            return true;
        }

        // API keys are often long alphanumeric strings
        if (value.length() > 20 && value.matches("^[a-zA-Z0-9_-]{20,}$")) {
            return true;
        }

        // Credit card numbers (basic pattern)
        if (value.matches("^[0-9 \\-]{13,19}$")) {
            return true;
        }

        return false;
    }

    /**
     * Sanitize result data to remove sensitive information.
     */
    private Object sanitizeResult(Object result) {
        if (result == null) {
            return null;
        }

        // Use the same sanitization logic as arguments
        return sanitizeArgument(result);
    }
}
