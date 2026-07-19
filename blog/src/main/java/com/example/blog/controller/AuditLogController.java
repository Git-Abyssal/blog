package com.example.blog.controller;

import com.example.blog.dto.ApiResponse;
import com.example.blog.dto.audit.AuditLogPagePayload;
import com.example.blog.dto.audit.AuditPeriod;
import com.example.blog.dto.audit.AuditStatisticsResponse;
import com.example.blog.dto.audit.DeleteLogsResult;
import com.example.blog.dto.audit.FailedLoginsPayload;
import com.example.blog.entity.AuditLogEntry;
import com.example.blog.mapper.AuditLogMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 审计日志查看API
 * 提供安全事件查询和分析功能
 */
@RestController
@RequestMapping("/api/admin/audit")
public class AuditLogController {

    @Autowired
    private AuditLogMapper auditLogMapper;

    /**
     * 分页查询审计日志
     * 仅站长可用
     */
    @GetMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        // 限制分页参数范围，防止DoS
        size = Math.max(1, Math.min(size, 100));
        page = Math.max(0, page);

        LocalDateTime start = null;
        LocalDateTime end = null;
        try {
            if (startDate != null && !startDate.isEmpty()) {
                start = LocalDateTime.parse(startDate + "T00:00:00");
            }
            if (endDate != null && !endDate.isEmpty()) {
                end = LocalDateTime.parse(endDate + "T23:59:59");
            }
        } catch (Exception e) {
            return ApiResponse.<Void>error(400, "日期格式错误，应为 yyyy-MM-dd").toResponseEntity();
        }

        long offset = (long) page * size;
        long total = auditLogMapper.countByFilters(action, username, start, end, status);
        List<AuditLogEntry> content = auditLogMapper.selectByFilters(action, username, start, end, status, offset, size);

        AuditLogPagePayload payload = new AuditLogPagePayload(
                content,
                total,
                (int) ((total + size - 1) / size),
                page,
                size
        );
        return ResponseEntity.ok(ApiResponse.ok(payload));
    }

    /**
     * 查找最近的登录失败记录
     * 用于安全分析
     */
    @GetMapping("/failed-logins")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> getRecentFailedLogins(
            @RequestParam(defaultValue = "10") int limit) {
        limit = Math.max(1, Math.min(limit, 100));
        List<AuditLogEntry> result = auditLogMapper.selectRecentFailedLoginAttempts(limit);
        FailedLoginsPayload payload = new FailedLoginsPayload(result, result.size());
        return ResponseEntity.ok(ApiResponse.ok(payload));
    }

    /**
     * 获取审计统计摘要
     * 包含操作成功数、失败数和成功率
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> getAuditStatistics(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        LocalDateTime start = null;
        LocalDateTime end = null;
        try {
            if (startDate != null && !startDate.isEmpty()) {
                start = LocalDateTime.parse(startDate + "T00:00:00");
            }
            if (endDate != null && !endDate.isEmpty()) {
                end = LocalDateTime.parse(endDate + "T23:59:59");
            }
        } catch (Exception e) {
            return ApiResponse.<Void>error(400, "日期格式错误").toResponseEntity();
        }

        long totalLogs = auditLogMapper.countByFilters(null, null, start, end, null);
        long successCount = auditLogMapper.countByFilters(null, null, start, end, "SUCCESS");
        long failureCount = totalLogs - successCount;
        String successRate = totalLogs > 0 ? String.format("%.2f%%", (successCount * 100.0 / totalLogs)) : "0%";
        AuditPeriod period = new AuditPeriod(
                startDate != null ? startDate : "all time",
                endDate != null ? endDate : "now"
        );

        AuditStatisticsResponse stats = new AuditStatisticsResponse(
                totalLogs, successCount, failureCount, successRate, period
        );
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    /**
     * 删除指定日期之前的审计日志
     * 用于数据清理和隐私保护
     */
    @DeleteMapping("/before/{date}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> deleteOldLogs(@PathVariable String date) {
        try {
            LocalDateTime cutoffDate = LocalDateTime.parse(date + "T00:00:00");
            int totalDeleted = 0;
            int batchDeleted;
            do {
                batchDeleted = auditLogMapper.deleteByTimestampBefore(cutoffDate);
                totalDeleted += batchDeleted;
            } while (batchDeleted >= 10000);
            DeleteLogsResult result = new DeleteLogsResult(date, totalDeleted);
            return ResponseEntity.ok(ApiResponse.ok("已删除旧的审计日志", result));
        } catch (Exception e) {
            return ApiResponse.<Void>error(400, "日期格式错误，应为 yyyy-MM-dd").toResponseEntity();
        }
    }
}
