package com.example.blog.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OwnerInfoResponse {
    private Long id;
    private String username;
    private boolean mustChangePassword;
}
