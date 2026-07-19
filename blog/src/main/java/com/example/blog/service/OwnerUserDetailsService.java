package com.example.blog.service;

import com.example.blog.entity.Owner;
import com.example.blog.mapper.OwnerMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

/**
 * 从数据库加载唯一站长账号，供 Spring Security 认证使用。
 */
@Service
public class OwnerUserDetailsService implements UserDetailsService {

    private static final String OWNER_AUTHORITY = "ROLE_OWNER";

    @Autowired
    private OwnerMapper ownerMapper;

    @Value("${blog.owner-username:admin}")
    private String ownerUsername;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String configuredOwner = ownerUsername == null ? "" : ownerUsername.trim();
        if (!configuredOwner.equals(username)) {
            throw new UsernameNotFoundException("Owner not found");
        }

        Owner owner = ownerMapper.selectById(1L);
        if (owner == null || !username.equals(owner.getUsername())) {
            throw new UsernameNotFoundException("Owner not found");
        }
        return new org.springframework.security.core.userdetails.User(
                owner.getUsername(),
                owner.getPassword(),
                true, true, true,
                true,
                Collections.singletonList(new SimpleGrantedAuthority(OWNER_AUTHORITY))
        );
    }
}
