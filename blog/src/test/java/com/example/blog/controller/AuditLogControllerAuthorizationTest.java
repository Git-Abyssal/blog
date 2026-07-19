package com.example.blog.controller;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AuditLogControllerAuthorizationTest {

    @Test
    void auditLogsRequireOwnerRole() throws Exception {
        PreAuthorize preAuthorize = AuditLogController.class
                .getMethod(
                        "getAuditLogs",
                        String.class,
                        String.class,
                        String.class,
                        String.class,
                        String.class,
                        int.class,
                        int.class)
                .getAnnotation(PreAuthorize.class);

        assertEquals("hasRole('OWNER')", preAuthorize.value());
    }
}
