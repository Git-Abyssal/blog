package com.example.blog.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.blog.entity.PasswordHistory;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PasswordHistoryMapper extends BaseMapper<PasswordHistory> {

    List<PasswordHistory> selectRecent(@Param("limit") int limit);

}
