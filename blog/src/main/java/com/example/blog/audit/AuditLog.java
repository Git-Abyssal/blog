package com.example.blog.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 审计日志注解
 *
 * 使用在需要审计的敏感操作方法上
 *
 * 示例：
 * @AuditLog(action = "CREATE_CATEGORY", description = "创建分类")
 * public Category createCategory(Category category) { ... }
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditLog {

    /**
     * 操作类型
     */
    String action();

    /**
     * 操作描述
     */
    String description() default "";

    /**
     * 是否记录请求参数
     */
    boolean logParameters() default false;

    /**
     * 是否记录返回结果
     */
    boolean logResult() default false;
}
