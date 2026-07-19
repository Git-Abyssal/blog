package com.example.blog.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("blog_owner")
public class Owner {
    @TableId
    private Long id;

    private String username;

    private String password;

    private Boolean passwordChanged = true;
}
