package com.example.blog.audit;

import com.example.blog.entity.AuditLogEntry;
import com.example.blog.mapper.AuditLogMapper;
import com.example.blog.dto.ChangePasswordRequest;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogMapper auditLogMapper;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private AuditLogService auditLogService;

    @Test
    void recordsFailedLoginAndTruncatesLongUserAgent() {
        when(request.getRemoteAddr()).thenReturn("203.0.113.10");
        when(request.getHeader("User-Agent")).thenReturn("a".repeat(600));
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/auth/login");

        auditLogService.recordLoginAttempt("alice", request, false, "Invalid username or password");

        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(auditLogMapper).insert(captor.capture());
        AuditLogEntry entry = captor.getValue();
        assertEquals("LOGIN", entry.getAction());
        assertEquals("FAILURE", entry.getStatus());
        assertEquals("alice", entry.getUsername());
        assertEquals("203.0.113.10", entry.getIpAddress());
        assertEquals(500, entry.getUserAgent().length());
    }

    @Test
    void redactsDtoContainingCamelCasePasswordField() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("OldPassword1!");
        request.setNewPassword("NewPassword1!");

        var method = AuditLogService.class.getDeclaredMethod("sanitizeArgument", Object.class);
        method.setAccessible(true);

        assertEquals("***REDACTED*** (contains sensitive fields)", method.invoke(auditLogService, request));
    }
}
