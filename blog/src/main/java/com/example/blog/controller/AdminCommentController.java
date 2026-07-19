package com.example.blog.controller;

import com.example.blog.dto.ApiResponse;
import com.example.blog.entity.Comment;
import com.example.blog.service.CommentService;
import com.example.blog.util.CurrentOwnerHelper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/comments")
public class AdminCommentController {

    @Autowired
    private CommentService commentService;

    @GetMapping
    public ResponseEntity<?> getComments(
            @RequestParam(defaultValue = Comment.STATUS_PENDING) String status,
            @PageableDefault(size = 20) Pageable pageable) {
        if (!CurrentOwnerHelper.isOwner()) {
            return ApiResponse.<Void>error(403, "无权限").toResponseEntity();
        }
        try {
            return ResponseEntity.ok(commentService.getCommentsByStatus(status, pageable));
        } catch (IllegalArgumentException e) {
            return ApiResponse.<Void>error(400, e.getMessage()).toResponseEntity();
        }
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveComment(@PathVariable Long id) {
        if (!CurrentOwnerHelper.isOwner()) {
            return ApiResponse.<Void>error(403, "无权限").toResponseEntity();
        }
        try {
            Comment approved = commentService.approveComment(id);
            return ResponseEntity.ok(ApiResponse.ok("评论已通过审核", approved));
        } catch (IllegalArgumentException e) {
            return ApiResponse.<Void>error(400, e.getMessage()).toResponseEntity();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteComment(@PathVariable Long id) {
        if (!CurrentOwnerHelper.isOwner()) {
            return ApiResponse.<Void>error(403, "无权限").toResponseEntity();
        }
        if (commentService.getCommentById(id).isEmpty()) {
            return ApiResponse.<Void>error(404, "评论不存在").toResponseEntity();
        }
        commentService.deleteComment(id);
        return ResponseEntity.ok(ApiResponse.ok("评论已删除"));
    }
}
