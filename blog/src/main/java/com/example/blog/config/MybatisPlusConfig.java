package com.example.blog.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * MyBatis-Plus Mapper 扫描配置。
 * 使用 @Profile("!test") 避免在单元测试（WebMvcTest 等）中注册真实 Mapper Bean，由测试替身提供。
 */
@Configuration
@Profile("!test")
@MapperScan("com.example.blog.mapper")
public class MybatisPlusConfig {
}
