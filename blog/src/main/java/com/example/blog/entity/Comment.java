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
import java.util.List;

@Data
@TableName("comments")
public class Comment {
    public static final String STATUS_PENDING = "pending";
    public static final String STATUS_APPROVED = "approved";

    @TableId(type = IdType.AUTO)
    private Long id;

    @NotBlank(message = "评论内容不能为空")
    @Size(min = 1, max = 10000, message = "评论内容必须在1-10000个字符之间")
    private String content;

    @TableField("owner_comment")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Boolean ownerComment = false;

    @TableField("article_id")
    private Long articleId;

    @TableField("guest_name")
    private String guestName;

    @TableField(exist = false)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String articleTitle;

    private LocalDateTime createdAt;

    @TableField("parent_id")
    private Long parentId;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String status;

    @TableField("reviewed_at")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime reviewedAt;

    @TableField(exist = false)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private List<Comment> replies;

}
