package com.example.blog.controller;

import com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration;
import com.example.blog.config.TestSecurityConfig;
import com.example.blog.entity.Category;
import com.example.blog.service.CategoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminCategoryController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        MybatisPlusAutoConfiguration.class
})
@Import(TestSecurityConfig.class)
@ActiveProfiles("test")
class AdminCategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CategoryService categoryService;

    @Test
    void returnsPagedCategories() throws Exception {
        Category category = new Category();
        category.setId(2L);
        category.setName("技术随笔");
        Category secondCategory = new Category();
        secondCategory.setId(1L);
        secondCategory.setName("默认分类");
        PageRequest pageRequest = PageRequest.of(1, 10);
        when(categoryService.getCategoriesForAdmin(argThat(pageable ->
                pageable.getPageNumber() == 1 && pageable.getPageSize() == 10)))
                .thenReturn(new PageImpl<>(List.of(category, secondCategory), pageRequest, 12));

        mockMvc.perform(get("/api/admin/categories")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("技术随笔"))
                .andExpect(jsonPath("$.totalElements").value(12))
                .andExpect(jsonPath("$.totalPages").value(2));

        verify(categoryService).getCategoriesForAdmin(argThat(pageable ->
                pageable.getPageNumber() == 1 && pageable.getPageSize() == 10));
    }

    @Test
    void reordersCategories() throws Exception {
        mockMvc.perform(put("/api/admin/categories/reorder")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"orderedIds":[2,1]}
                                """))
                .andExpect(status().isOk());

        verify(categoryService).reorderCategories(List.of(2L, 1L));
    }
}
