package com.example.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("audit_logs")
public class AuditLogEntry {
    @TableId(type = IdType.AUTO)
    private Long id;

    private LocalDateTime timestamp;
    private String action;
    private String description;
    private String username;

    @TableField("ip_address")
    private String ipAddress;

    @TableField("user_agent")
    private String userAgent;

    @TableField("http_method")
    private String httpMethod;

    @TableField("request_path")
    private String requestPath;

    private String parameters;
    private String result;
    private String status;

    @TableField("error_message")
    private String errorMessage;

    @TableField("class_name")
    private String className;

    @TableField("method_name")
    private String methodName;

    @TableField("duration_ms")
    private Long durationMs;
}
