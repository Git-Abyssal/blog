package com.example.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("password_history")
public class PasswordHistory {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String passwordHash;

    private LocalDateTime changedAt;
}
