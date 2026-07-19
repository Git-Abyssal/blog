package com.example.blog.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.blog.entity.AuditLogEntry;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface AuditLogMapper extends BaseMapper<AuditLogEntry> {

    List<AuditLogEntry> selectByFilters(
            @Param("action") String action,
            @Param("username") String username,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            @Param("status") String status,
            @Param("offset") long offset,
            @Param("size") int size);

    long countByFilters(
            @Param("action") String action,
            @Param("username") String username,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            @Param("status") String status);

    List<AuditLogEntry> selectRecentFailedLoginAttempts(@Param("limit") int limit);

    int deleteByTimestampBefore(@Param("timestamp") LocalDateTime timestamp);
}
