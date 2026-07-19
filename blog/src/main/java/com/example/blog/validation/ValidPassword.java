package com.example.blog.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 密码复杂度验证注解
 *
 * 使用示例：
 * @ValidPassword
 * private String password;
 */
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordStrengthConstraintValidator.class)
@Documented
public @interface ValidPassword {

    String message() default "密码不符合复杂度要求";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
