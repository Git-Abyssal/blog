package com.example.blog.validation;

import com.example.blog.util.PasswordValidator;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Bean Validation 适配：将 @ValidPassword 委托给 PasswordValidator 做复杂度校验。
 */
public class PasswordStrengthConstraintValidator implements ConstraintValidator<ValidPassword, String> {

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) {
            return false;
        }
        PasswordValidator.PasswordValidationResult result = PasswordValidator.validate(password);
        if (!result.valid) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(result.errorMessage)
                   .addConstraintViolation();
            return false;
        }
        return true;
    }
}
