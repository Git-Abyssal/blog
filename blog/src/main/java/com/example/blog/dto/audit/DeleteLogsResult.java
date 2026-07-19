package com.example.blog.dto.audit;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeleteLogsResult {
    private String cutoffDate;
    private int deletedCount;
}
