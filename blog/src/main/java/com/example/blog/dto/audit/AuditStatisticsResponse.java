package com.example.blog.dto.audit;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditStatisticsResponse {
    private long totalOperations;
    private long successCount;
    private long failureCount;
    private String successRate;
    private AuditPeriod period;
}
