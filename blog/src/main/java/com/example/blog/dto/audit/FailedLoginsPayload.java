package com.example.blog.dto.audit;

import com.example.blog.entity.AuditLogEntry;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FailedLoginsPayload {
    private List<AuditLogEntry> failedLogins;
    private int count;
}
