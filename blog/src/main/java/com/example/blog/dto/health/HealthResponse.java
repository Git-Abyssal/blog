package com.example.blog.dto.health;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HealthResponse {
    private String status;
    private long timestamp;
    private ComponentStatus database;
    private ComponentStatus redis;
}
