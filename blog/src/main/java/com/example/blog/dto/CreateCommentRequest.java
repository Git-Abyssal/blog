package com.example.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 评论提交请求。游客只能填写昵称和内容；parentId 仅供已登录站长回复评论。
 */
@Data
public class CreateCommentRequest {

    @NotBlank(message = "评论内容不能为空")
    @Size(max = 10000, message = "评论内容不能超过10000个字符")
    private String content;

    @Size(max = 50, message = "游客昵称不能超过50个字符")
    private String guestName;

    public void setGuestName(String guestName) {
        this.guestName = guestName == null ? null : guestName.trim();
    }

    private Long parentId;
}
