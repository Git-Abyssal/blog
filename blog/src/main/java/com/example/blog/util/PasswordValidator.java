package com.example.blog.util;

import java.util.regex.Pattern;

/**
 * 密码复杂度验证工具
 *
 * 密码要求：
 * - 最小长度：8 个字符
 * - 最大长度：100 个字符
 * - 至少包含一个大写字母
 * - 至少包含一个小写字母
 * - 至少包含一个数字
 * - 至少包含一个特殊字符
 */
public class PasswordValidator {

    private static final int MIN_LENGTH = 8;
    private static final int MAX_LENGTH = 100;

    private static final Pattern UPPERCASE_PATTERN = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile("[a-z]");
    private static final Pattern DIGIT_PATTERN = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL_CHAR_PATTERN = Pattern.compile("[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]");

    /**
     * 验证密码是否符合复杂度要求
     *
     * @param password 密码
     * @return 验证结果
     */
    public static PasswordValidationResult validate(String password) {
        if (password == null) {
            return new PasswordValidationResult(false, "密码不能为空");
        }

        if (password.length() < MIN_LENGTH) {
            return new PasswordValidationResult(false,
                String.format("密码长度至少为 %d 个字符", MIN_LENGTH));
        }

        if (password.length() > MAX_LENGTH) {
            return new PasswordValidationResult(false,
                String.format("密码长度不能超过 %d 个字符", MAX_LENGTH));
        }

        if (!UPPERCASE_PATTERN.matcher(password).find()) {
            return new PasswordValidationResult(false, "密码必须包含至少一个大写字母");
        }

        if (!LOWERCASE_PATTERN.matcher(password).find()) {
            return new PasswordValidationResult(false, "密码必须包含至少一个小写字母");
        }

        if (!DIGIT_PATTERN.matcher(password).find()) {
            return new PasswordValidationResult(false, "密码必须包含至少一个数字");
        }

        if (!SPECIAL_CHAR_PATTERN.matcher(password).find()) {
            return new PasswordValidationResult(false, "密码必须包含至少一个特殊字符 (!@#$%^&*等)");
        }

        return new PasswordValidationResult(true, "密码符合要求");
    }

    /**
     * 密码验证结果
     */
    public static class PasswordValidationResult {
        public final boolean valid;
        public final String errorMessage;

        public PasswordValidationResult(boolean valid, String errorMessage) {
            this.valid = valid;
            this.errorMessage = errorMessage;
        }
    }
}
