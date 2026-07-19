package com.example.blog.util;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClientIpResolverTest {

    @Test
    void resolvesForwardedForOnlyFromTrustedProxy() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getHeader("X-Forwarded-For")).thenReturn("203.0.113.10, 10.0.0.1");

        String result = ClientIpResolver.resolve(request, "127.0.0.1,10.0.0.1");

        assertEquals("203.0.113.10", result);
    }

    @Test
    void ignoresForwardedForFromUntrustedRemoteAddress() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("198.51.100.2");
        when(request.getHeader("X-Forwarded-For")).thenReturn("203.0.113.10");

        String result = ClientIpResolver.resolve(request, "127.0.0.1");

        assertEquals("198.51.100.2", result);
    }

    @Test
    void resolvesForwardedForFromTrustedDockerCidr() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("172.18.0.4");
        when(request.getHeader("X-Forwarded-For")).thenReturn("203.0.113.15");

        String result = ClientIpResolver.resolve(request, "127.0.0.1,172.16.0.0/12");

        assertEquals("203.0.113.15", result);
    }

    @Test
    void ignoresSpoofedAddressesBeforeTheActualClient() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("172.18.0.4");
        when(request.getHeader("X-Forwarded-For"))
                .thenReturn("203.0.113.99, 198.51.100.8");

        String result = ClientIpResolver.resolve(request, "172.16.0.0/12");

        assertEquals("198.51.100.8", result);
    }

    @Test
    void rejectsNonIpValuesFromForwardingHeaders() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("172.18.0.4");
        when(request.getHeader("X-Forwarded-For")).thenReturn("attacker.example");
        when(request.getHeader("X-Real-IP")).thenReturn("198.51.100.7");

        String result = ClientIpResolver.resolve(request, "172.16.0.0/12");

        assertEquals("198.51.100.7", result);
    }
}
