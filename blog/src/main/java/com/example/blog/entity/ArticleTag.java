package com.example.blog.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 文章-标签关联表（多对多）
 */
@Data
@TableName("article_tags")
public class ArticleTag {
    private Long articleId;
    private Long tagId;
}
