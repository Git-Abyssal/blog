package com.example.blog.util;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

/**
 * XSS 防护：使用 Jsoup 清理 HTML，防止 XSS 攻击。
 */
public class XssSanitizer {

    private static final Safelist STRICT_SAFELIST = Safelist.none();
    private static final Safelist COMMENT_SAFELIST = new Safelist()
            .addTags("b", "i", "em", "strong", "a", "p", "br", "code", "pre", "blockquote")
            .addAttributes("a", "href")
            .addProtocols("a", "href", "http", "https");

    public static String cleanStrict(String content) {
        if (content == null) {
            return null;
        }
        return Jsoup.clean(content, "", STRICT_SAFELIST, new Document.OutputSettings().prettyPrint(false));
    }

    public static String cleanComment(String content) {
        if (content == null) {
            return null;
        }
        return Jsoup.clean(content, "", COMMENT_SAFELIST, new Document.OutputSettings().prettyPrint(false));
    }

}
