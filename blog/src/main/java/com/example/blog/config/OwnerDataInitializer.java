package com.example.blog.config;

import com.example.blog.entity.Category;
import com.example.blog.entity.Owner;
import com.example.blog.mapper.CategoryMapper;
import com.example.blog.mapper.OwnerMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 首次启动时创建站长账号和默认分类。
 */
@Configuration
public class OwnerDataInitializer {

    private static final Logger logger = LoggerFactory.getLogger(OwnerDataInitializer.class);

    @Value("${blog.owner-username:admin}")
    private String ownerUsername;

    @Value("${BLOG_OWNER_INITIAL_PASSWORD:}")
    private String ownerInitialPassword;

    @Bean
    CommandLineRunner initData(OwnerMapper ownerMapper,
                              CategoryMapper categoryMapper,
                              PasswordEncoder passwordEncoder) {
        return args -> {
            String configuredOwner = ownerUsername == null ? "" : ownerUsername.trim();
            if (configuredOwner.isEmpty() || configuredOwner.length() > 50) {
                throw new IllegalStateException("BLOG_OWNER_USERNAME must contain 1-50 characters");
            }

            logger.info("========================================");
            logger.info("Checking owner account status...");

            Owner existingOwner = ownerMapper.selectById(1L);
            if (existingOwner == null) {
                String initialPassword = ownerInitialPassword;
                if (initialPassword == null || initialPassword.isBlank()) {
                    logger.error("ERROR: BLOG_OWNER_INITIAL_PASSWORD environment variable is not set!");
                    logger.error("Please set the environment variable and restart the application.");
                    throw new RuntimeException("BLOG_OWNER_INITIAL_PASSWORD environment variable is not set");
                }

                if (initialPassword.length() < 8) {
                    logger.error("ERROR: Owner password must be at least 8 characters long!");
                    throw new RuntimeException("BLOG_OWNER_INITIAL_PASSWORD must be at least 8 characters");
                }

                Owner owner = new Owner();
                owner.setId(1L);
                owner.setUsername(configuredOwner);
                owner.setPassword(passwordEncoder.encode(initialPassword));
                owner.setPasswordChanged(false);

                ownerMapper.insert(owner);
                logger.info("Initialization successful! Owner account: {}", configuredOwner);
                logger.info("You will be required to change your password on first login.");
            } else {
                if (!configuredOwner.equals(existingOwner.getUsername())) {
                    throw new IllegalStateException(
                            "BLOG_OWNER_USERNAME does not match the initialized owner account");
                }
                logger.info("Owner account already exists, skipping initialization.");
            }

            if (categoryMapper.selectCount(null) == 0) {
                Category category = new Category();
                category.setName("默认分类");
                categoryMapper.insert(category);
                logger.info("Default category initialized successfully!");
            }
            logger.info("========================================");
        };
    }
}
