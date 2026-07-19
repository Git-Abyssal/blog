package com.example.blog.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 登录成功返回站长信息。JWT 只通过 HttpOnly Cookie 下发。
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponse {
    private OwnerInfoResponse owner;
}
