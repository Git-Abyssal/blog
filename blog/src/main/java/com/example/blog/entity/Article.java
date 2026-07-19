package com.example.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * 文章实体。正文内容最大长度为 100000 个字符。
 */
@Data
@TableName("articles")
public class Article {
    public static final String STATUS_DRAFT = "draft";
    public static final String STATUS_PUBLISHED = "published";

    @TableId(type = IdType.AUTO)
    private Long id;

    @NotBlank(message = "Title is required")
    @Size(max = 200)
    private String title;

    @NotBlank(message = "Content is required")
    @Size(max = 100000, message = "文章内容不能超过100000个字符")
    private String content;

    @Size(max = 500)
    private String summary;

    @TableField("cover_image")
    private String coverImage;

    @TableField("category_id")
    private Long categoryId;

    /** 非表字段：分类，由 Service 层填充 */
    @TableField(exist = false)
    private Category category;

    /** 非表字段：标签，由 Service 层填充 */
    @TableField(exist = false)
    private Set<Tag> tags;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Integer views = 0;

    private String status = STATUS_PUBLISHED;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** 非表字段：评论数，由 SQL 子查询填充 */
    @TableField(exist = false)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Integer commentCount;
}
