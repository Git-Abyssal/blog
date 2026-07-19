package com.example.blog.controller;

import com.example.blog.entity.Article;
import com.example.blog.entity.Comment;
import com.example.blog.dto.CreateCommentRequest;
import com.example.blog.mapper.ArticleMapper;
import com.example.blog.service.CommentService;
import com.example.blog.dto.ApiResponse;
import com.example.blog.util.CurrentOwnerHelper;
import com.example.blog.util.XssSanitizer;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/comments")
public class CommentController {
    @Autowired
    private CommentService commentService;

    @Autowired
    private ArticleMapper articleMapper;

    @PostMapping("/article/{articleId}")
    public ResponseEntity<?> createComment(
            @PathVariable Long articleId,
            @Valid @RequestBody CreateCommentRequest request) {

        Article article = articleMapper.selectById(articleId);
        if (article == null) {
            return ResponseEntity.notFound().build();
        }
        boolean isSiteOwner = CurrentOwnerHelper.isOwner();
        if (!Article.STATUS_PUBLISHED.equals(article.getStatus()) && !isSiteOwner) {
            return ApiResponse.<Void>error(404, "文章不存在").toResponseEntity();
        }

        String content = XssSanitizer.cleanComment(request.getContent());
        if (content == null || content.isBlank()) {
            return ApiResponse.<Void>error(400, "评论内容不能为空").toResponseEntity();
        }

        Comment comment = new Comment();
        comment.setContent(content);
        comment.setArticleId(articleId);

        if (!isSiteOwner) {
            if (request.getParentId() != null) {
                return ApiResponse.<Void>error(400, "游客暂不支持回复评论").toResponseEntity();
            }
            String guestName = XssSanitizer.cleanStrict(request.getGuestName());
            if (guestName == null || guestName.isBlank()) {
                return ApiResponse.<Void>error(400, "游客昵称不能为空").toResponseEntity();
            }
            comment.setGuestName(guestName.trim());
            commentService.createGuestComment(comment);
            ApiResponse<Void> response = new ApiResponse<>(HttpStatus.ACCEPTED.value(),
                    "评论已提交，审核通过后显示", null);
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
        }

        comment.setOwnerComment(true);
        comment.setParentId(request.getParentId());

        if (comment.getParentId() != null) {
            return ResponseEntity.ok(commentService.createReply(articleId, comment));
        }
        return ResponseEntity.ok(commentService.createOwnerComment(comment));
    }

    @GetMapping("/article/{articleId}/threaded")
    public ResponseEntity<?> getThreadedComments(
            @PathVariable Long articleId,
            @PageableDefault(size = 20) Pageable pageable) {
        if (!canViewArticleComments(articleId)) {
            return ApiResponse.<Void>error(404, "文章不存在").toResponseEntity();
        }
        return ResponseEntity.ok(commentService.getTopLevelComments(articleId, pageable));
    }

    private boolean canViewArticleComments(Long articleId) {
        Article article = articleMapper.selectById(articleId);
        if (article == null) {
            return false;
        }
        if (Article.STATUS_PUBLISHED.equals(article.getStatus())) {
            return true;
        }
        return CurrentOwnerHelper.isOwner();
    }
}
