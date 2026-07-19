package com.example.blog.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.blog.entity.Tag;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface TagMapper extends BaseMapper<Tag> {

    @Select("SELECT COUNT(*) FROM tags")
    long countAll();

    @Select("SELECT id, name, sort_order FROM tags ORDER BY sort_order DESC, id DESC LIMIT #{limit} OFFSET #{offset}")
    List<Tag> selectPageForAdmin(@Param("offset") long offset, @Param("limit") int limit);

    @Update("UPDATE tags SET sort_order = #{sortOrder} WHERE id = #{id}")
    int updateSortOrder(@Param("id") Long id, @Param("sortOrder") Long sortOrder);
}
