package com.example.blog.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * JWT 生成与解析，支持单点登录（sessionId 与 Redis 比对）。
 */
@Component
@Profile("!test")
public class JwtTokenProvider {

    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    /** 单点登录：JWT 中的 session 标识，与 Redis 中存储的当前有效 sid 一致才视为有效 */
    public static final String CLAIM_SID = "sid";

    public String generateToken(UserDetails userDetails) {
        return generateToken(userDetails, java.util.UUID.randomUUID().toString());
    }

    /** 生成带 sessionId 的 token，用于单点登录（登录时需将 sid 写入 Redis） */
    public String generateToken(UserDetails userDetails, String sessionId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_SID, sessionId);
        return createToken(claims, userDetails.getUsername());
    }

    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }

    /** 从 token 中取出 sid，用于与 Redis 中的当前会话比对 */
    public String extractSid(String token) {
        try {
            Object sid = extractAllClaims(token).get(CLAIM_SID);
            return sid != null ? sid.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private SecretKey getSigningKey() {
        try {
            byte[] keyBytes = Decoders.BASE64.decode(secret);
            return Keys.hmacShaKeyFor(keyBytes);
        } catch (IllegalArgumentException e) {
            // Not valid Base64 - fail fast, do not fall back to raw bytes
            throw new IllegalStateException(
                "JWT secret must be a valid Base64-encoded string (at least 256 bits). " +
                "Generate with: openssl rand -base64 64", e
            );
        }
    }
}
