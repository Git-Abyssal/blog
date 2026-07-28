package com.example.blog.dto;

import com.example.blog.validation.ValidPassword;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 密码修改请求DTO
 *
 * 密码要求：
 * - 8-100 个字符
 * - 至少一个大写字母
 * - 至少一个小写字母
 * - 至少一个数字
 * - 至少一个特殊字符
 */
@Data
public class ChangePasswordRequest {

    @NotBlank(message = "当前密码不能为空")
    private String currentPassword;

    @NotBlank(message = "新密码不能为空")
    @ValidPassword  // 密码复杂度验证：大小写字母+数字+特殊字符
    private String newPassword;
}
