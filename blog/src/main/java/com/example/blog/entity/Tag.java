package com.example.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@TableName("tags")
public class Tag {
    @TableId(type = IdType.AUTO)
    private Long id;

    @NotBlank(message = "标签名称不能为空")
    @Size(min = 1, max = 30, message = "标签名称长度必须在1-30个字符之间")
    private String name;

    @JsonIgnore
    private Long sortOrder;
}
