package com.example.blog.util;

/**
 * SQL/LIKE 转义，防止注入与通配符滥用。
 */
public class SqlEscaper {

    /**
     * 转义 LIKE 中的 %、_ 和 /（配合 JPQL ESCAPE '/' 使用）。
     */
    public static String escapeLikeSearch(String input) {
        if (input == null || input.isEmpty()) {
            return "";
        }
        return input.replace("/", "//").replace("%", "/%").replace("_", "/_");
    }

    /**
     * 移除控制字符，降低注入风险。
     */
    public static String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }
        return input.replaceAll("[\\p{Cntrl}]", "");
    }
}
