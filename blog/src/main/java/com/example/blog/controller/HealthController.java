package com.example.blog.controller;

import com.example.blog.dto.health.ComponentStatus;
import com.example.blog.dto.health.HealthResponse;
import com.example.blog.dto.health.LivenessResponse;
import com.example.blog.dto.health.ReadinessResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;

@RestController
public class HealthController {

    private static final Logger logger = LoggerFactory.getLogger(HealthController.class);

    @Autowired(required = false)
    private DataSource dataSource;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @GetMapping("/health")
    public ResponseEntity<HealthResponse> health() {
        boolean databaseUp = checkDatabase();
        boolean redisUp = checkRedis();
        boolean isDown = !databaseUp || !redisUp;

        HealthResponse body = new HealthResponse(
                isDown ? "DOWN" : "UP",
                System.currentTimeMillis(),
                new ComponentStatus(databaseUp ? "UP" : "DOWN"),
                new ComponentStatus(redisUp ? "UP" : "DOWN")
        );
        return ResponseEntity
                .status(isDown ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK)
                .body(body);
    }

    @GetMapping("/health/liveness")
    public LivenessResponse liveness() {
        return new LivenessResponse("UP");
    }

    @GetMapping("/health/readiness")
    public ResponseEntity<ReadinessResponse> readiness() {
        boolean databaseUp = checkDatabase();
        boolean redisUp = checkRedis();
        boolean isReady = databaseUp && redisUp;

        ReadinessResponse body = new ReadinessResponse(
                isReady ? "UP" : "DOWN",
                databaseUp ? "UP" : "DOWN",
                redisUp ? "UP" : "DOWN"
        );
        return ResponseEntity
                .status(isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
                .body(body);
    }

    private boolean checkDatabase() {
        try {
            if (dataSource == null) {
                return false;
            }
            try (Connection conn = dataSource.getConnection()) {
                return conn.isValid(2);
            }
        } catch (Exception e) {
            logger.warn("Health check: database unavailable - {}", e.getMessage());
            return false;
        }
    }

    private boolean checkRedis() {
        try {
            if (redisTemplate == null) {
                return false;
            }
            var factory = redisTemplate.getConnectionFactory();
            if (factory == null) {
                return false;
            }
            var conn = factory.getConnection();
            try {
                conn.ping();
            } finally {
                conn.close();
            }
            return true;
        } catch (Exception e) {
            logger.warn("Health check: Redis unavailable - {}", e.getMessage());
            return false;
        }
    }
}
