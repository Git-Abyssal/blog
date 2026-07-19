package com.example.blog.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class ReorderRequest {

    @NotEmpty(message = "排序列表不能为空")
    private List<Long> orderedIds;
}
