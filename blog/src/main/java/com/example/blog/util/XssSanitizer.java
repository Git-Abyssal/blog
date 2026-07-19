package com.example.blog.util;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

import java.util.Set;
import java.util.regex.Pattern;

/**
 * XSS 防护：使用 Jsoup 清理 HTML，防止 XSS 攻击。
 */
public class XssSanitizer {

    private static final Set<String> ALLOWED_CLASS_NAMES = Set.of(
        "hljs", "language-", "javascript", "java", "python", "bash", "css", "html", "sql",
        "typescript", "json", "xml", "yaml", "markdown", "go", "rust", "php", "ruby",
        "prism", "token", "keyword", "string", "comment", "number", "operator",
        "markdown-body", "hljs-keyword", "hljs-string", "hljs-comment", "hljs-number"
    );

    private static boolean isClassValueSafe(String className) {
        if (className == null || className.trim().isEmpty()) {
            return false;
        }
        for (String cls : className.trim().split("\\s+")) {
            if (!ALLOWED_CLASS_NAMES.contains(cls) && !cls.startsWith("language-") && !cls.startsWith("hljs-") && !cls.matches("^[a-z][a-z0-9-_]*$")) {
                return false;
            }
        }
        return true;
    }

    private static final Safelist STRICT_SAFELIST = Safelist.none();
    private static final Safelist RELAXED_SAFELIST = new Safelist()
            .addTags("h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span", "br", "hr",
                     "strong", "b", "em", "i", "u", "s", "sub", "sup",
                     "ul", "ol", "li", "blockquote", "pre", "code", "a", "img",
                     "table", "thead", "tbody", "tr", "th", "td")
            .addAttributes("a", "href", "title", "rel")
            .addAttributes("img", "src", "alt", "title", "width", "height")
            .addProtocols("a", "href", "http", "https", "mailto")
            .addProtocols("img", "src", "http", "https", "data")
            .addAttributes("a", "target", "rel")
            .addAttributes("code", "class");
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

    public static String cleanRelaxed(String content) {
        if (content == null) {
            return null;
        }
        String cleaned = Jsoup.clean(content, "", RELAXED_SAFELIST, new Document.OutputSettings().prettyPrint(false));
        return sanitizeClassAttributes(cleaned);
    }

    public static String cleanComment(String content) {
        if (content == null) {
            return null;
        }
        return Jsoup.clean(content, "", COMMENT_SAFELIST, new Document.OutputSettings().prettyPrint(false));
    }

    private static String sanitizeClassAttributes(String html) {
        if (html == null || html.isEmpty()) {
            return html;
        }
        Pattern pattern = Pattern.compile("class=\"([^\"]+)\"");
        java.util.regex.Matcher matcher = pattern.matcher(html);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            if (isClassValueSafe(matcher.group(1))) {
                matcher.appendReplacement(sb, matcher.group(0));
            } else {
                matcher.appendReplacement(sb, "");
            }
        }
        matcher.appendTail(sb);
        return sb.toString();
    }
}
