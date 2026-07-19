package com.example.blog.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.blog.entity.Article;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface ArticleMapper extends BaseMapper<Article> {

    List<Article> selectAllWithDetails(@Param("offset") long offset, @Param("size") int size);

    List<Article> selectLatestForRss(@Param("limit") int limit);

    List<Article> selectLatestForSitemap(@Param("limit") int limit);

    long countAll();

    List<Article> searchArticles(@Param("keyword") String keyword, @Param("offset") long offset, @Param("size") int size);

    long countSearch(@Param("keyword") String keyword);

    Article selectWithDetailsById(@Param("id") Long id);

    List<Article> selectRelatedArticles(@Param("articleId") Long articleId, @Param("categoryId") Long categoryId);

    List<Article> selectAllForAdmin(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("categoryId") Long categoryId,
            @Param("tagId") Long tagId,
            @Param("offset") long offset,
            @Param("size") int size);

    long countAllForAdmin(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("categoryId") Long categoryId,
            @Param("tagId") Long tagId);

    List<Article> selectByCategoryId(@Param("categoryId") Long categoryId, @Param("offset") long offset, @Param("size") int size);
    long countByCategoryId(@Param("categoryId") Long categoryId);
    List<Article> selectByTagId(@Param("tagId") Long tagId, @Param("offset") long offset, @Param("size") int size);
    long countByTagId(@Param("tagId") Long tagId);
    List<Article> selectHotArticles(@Param("offset") long offset, @Param("size") int size);
    long countHotArticles();

    @Update("UPDATE articles SET views = views + #{count} WHERE id = #{id}")
    int incrementViews(@Param("id") Long id, @Param("count") int count);
}
