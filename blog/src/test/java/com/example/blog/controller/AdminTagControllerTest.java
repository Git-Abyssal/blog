package com.example.blog.controller;

import com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration;
import com.example.blog.config.TestSecurityConfig;
import com.example.blog.entity.Tag;
import com.example.blog.service.TagService;
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

@WebMvcTest(controllers = AdminTagController.class, excludeAutoConfiguration = {
        SecurityAutoConfiguration.class,
        MybatisPlusAutoConfiguration.class
})
@Import(TestSecurityConfig.class)
@ActiveProfiles("test")
class AdminTagControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TagService tagService;

    @Test
    void returnsPagedTags() throws Exception {
        Tag first = tag(12L, "React");
        Tag second = tag(11L, "Spring Boot");
        PageRequest pageRequest = PageRequest.of(1, 10);
        when(tagService.getTagsForAdmin(argThat(pageable ->
                pageable.getPageNumber() == 1 && pageable.getPageSize() == 10)))
                .thenReturn(new PageImpl<>(List.of(first, second), pageRequest, 12));

        mockMvc.perform(get("/api/admin/tags")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("React"))
                .andExpect(jsonPath("$.totalElements").value(12))
                .andExpect(jsonPath("$.totalPages").value(2));

        verify(tagService).getTagsForAdmin(argThat(pageable ->
                pageable.getPageNumber() == 1 && pageable.getPageSize() == 10));
    }

    @Test
    void reordersTags() throws Exception {
        mockMvc.perform(put("/api/admin/tags/reorder")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"orderedIds":[2,1]}
                                """))
                .andExpect(status().isOk());

        verify(tagService).reorderTags(List.of(2L, 1L));
    }

    private Tag tag(Long id, String name) {
        Tag tag = new Tag();
        tag.setId(id);
        tag.setName(name);
        return tag;
    }
}
