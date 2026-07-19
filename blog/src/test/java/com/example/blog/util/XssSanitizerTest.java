package com.example.blog.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class XssSanitizerTest {

    @Test
    void cleanCommentUsesCommentSafeList() {
        String dirty = "<p class=\"markdown-body\">hi <a href=\"https://example.com\">link</a>"
                + "<img src=\"https://example.com/a.png\"><code class=\"language-java\">code</code>"
                + "<script>alert(1)</script></p>";

        String cleaned = XssSanitizer.cleanComment(dirty);

        assertTrue(cleaned.contains("<a href=\"https://example.com\""));
        assertTrue(cleaned.contains("<code>code</code>"));
        assertFalse(cleaned.contains("<img"));
        assertFalse(cleaned.contains("class="));
        assertFalse(cleaned.contains("<script"));
    }
}
