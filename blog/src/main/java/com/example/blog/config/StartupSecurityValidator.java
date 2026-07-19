package com.example.blog.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * 启动时校验安全相关配置（如 JWT 密钥强度），配置不合格则启动失败。
 */
@Configuration
public class StartupSecurityValidator {

    private static final Logger logger = LoggerFactory.getLogger(StartupSecurityValidator.class);
    private static final int MIN_JWT_SECRET_LENGTH = 44;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @PostConstruct
    public void validateSecurityConfig() {
        logger.info("========================================");
        logger.info("Validating security configuration...");

        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalArgumentException("JWT_SECRET environment variable is not set! Please set a strong random key in .env file.");
        }
        if (jwtSecret.length() < MIN_JWT_SECRET_LENGTH) {
            throw new IllegalArgumentException(
                String.format("JWT_SECRET length insufficient! Current: %d, Minimum: %d (256 bits). Generate with: openssl rand -base64 64",
                    jwtSecret.length(), MIN_JWT_SECRET_LENGTH));
        }

        String[] weakSecrets = { "secret", "password", "jwtsecret", "jwtpassword",
            "5bf890987c9876f5e4d3c2b1a0f9e8d7c6b5a4938271605f4e3d2c1b0a9f8e7d" };
        for (String weak : weakSecrets) {
            if (jwtSecret.toLowerCase().contains(weak.toLowerCase())) {
                throw new IllegalArgumentException("JWT_SECRET appears weak or example. Generate a new strong random key.");
            }
        }

        logger.info("JWT secret validation passed ✓");
        logger.info("Security configuration validation completed ✓");
        logger.info("========================================");
    }
}
