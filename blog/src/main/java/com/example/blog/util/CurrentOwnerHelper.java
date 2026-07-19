package com.example.blog.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 当前站长账号辅助方法。
 */
public final class CurrentOwnerHelper {

    private CurrentOwnerHelper() {
    }

    public static boolean isOwner() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null) {
            return auth.getAuthorities().stream()
                    .anyMatch(grantedAuthority ->
                            grantedAuthority.getAuthority().equals("ROLE_OWNER"));
        }
        return false;
    }

}
