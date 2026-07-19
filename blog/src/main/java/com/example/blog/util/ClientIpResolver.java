package com.example.blog.util;

import jakarta.servlet.http.HttpServletRequest;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.List;

/**
 * Resolves the client IP while only trusting forwarding headers from known proxies.
 */
public final class ClientIpResolver {

    private ClientIpResolver() {
    }

    public static String resolve(HttpServletRequest request, String trustedProxiesConfig) {
        if (request == null) {
            return "unknown";
        }

        String remoteAddr = request.getRemoteAddr();
        if (isTrustedProxy(remoteAddr, trustedProxiesConfig)) {
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank() && !"unknown".equalsIgnoreCase(forwardedFor)) {
                String resolved = resolveForwardedChain(forwardedFor, remoteAddr, trustedProxiesConfig);
                if (resolved != null) {
                    return resolved;
                }
            }

            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank() && !"unknown".equalsIgnoreCase(realIp) && isValidIp(realIp)) {
                return realIp;
            }
        }

        return remoteAddr != null ? remoteAddr : "unknown";
    }

    /**
     * Walk the forwarding chain from the nearest hop to the farthest. Once an
     * untrusted hop is reached, anything to its left is client-controlled and
     * must be ignored.
     */
    private static String resolveForwardedChain(
            String forwardedFor,
            String remoteAddr,
            String trustedProxiesConfig) {
        String current = remoteAddr;
        boolean foundValidAddress = false;
        String[] forwardedAddresses = forwardedFor.split(",");

        for (int i = forwardedAddresses.length - 1; i >= 0; i--) {
            if (!isTrustedProxy(current, trustedProxiesConfig)) {
                return current;
            }

            String candidate = forwardedAddresses[i].trim();
            if (!isValidIp(candidate)) {
                continue;
            }
            current = candidate;
            foundValidAddress = true;
        }

        return foundValidAddress ? current : null;
    }

    private static boolean isTrustedProxy(String ip, String trustedProxiesConfig) {
        if (ip == null || trustedProxiesConfig == null || trustedProxiesConfig.isBlank()) {
            return false;
        }
        List<String> trustedProxies = Arrays.stream(trustedProxiesConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        return trustedProxies.stream().anyMatch(entry -> matchesAddressOrCidr(ip, entry));
    }

    private static boolean isValidIp(String ip) {
        return parseIpLiteral(ip) != null;
    }

    private static boolean matchesAddressOrCidr(String ip, String trustedEntry) {
        if (!trustedEntry.contains("/")) {
            InetAddress candidate = parseIpLiteral(ip);
            InetAddress trusted = parseIpLiteral(trustedEntry);
            return candidate != null && trusted != null && candidate.equals(trusted);
        }

        String[] parts = trustedEntry.split("/", 2);
        if (parts.length != 2) {
            return false;
        }

        InetAddress candidate = parseIpLiteral(ip);
        InetAddress network = parseIpLiteral(parts[0]);
        if (candidate == null || network == null) {
            return false;
        }

        byte[] candidateBytes = candidate.getAddress();
        byte[] networkBytes = network.getAddress();
        if (candidateBytes.length != networkBytes.length) {
            return false;
        }

        final int prefixLength;
        try {
            prefixLength = Integer.parseInt(parts[1]);
        } catch (NumberFormatException ex) {
            return false;
        }
        if (prefixLength < 0 || prefixLength > candidateBytes.length * 8) {
            return false;
        }

        int fullBytes = prefixLength / 8;
        int remainingBits = prefixLength % 8;
        for (int i = 0; i < fullBytes; i++) {
            if (candidateBytes[i] != networkBytes[i]) {
                return false;
            }
        }
        if (remainingBits == 0) {
            return true;
        }

        int mask = 0xFF << (8 - remainingBits);
        return (candidateBytes[fullBytes] & mask) == (networkBytes[fullBytes] & mask);
    }

    /** Parse an IP literal without resolving host names through DNS. */
    private static InetAddress parseIpLiteral(String value) {
        if (value == null || value.isBlank() || value.length() >= 50
                || value.contains("\n") || value.contains("\r")) {
            return null;
        }

        String ip = value.trim();
        if (ip.startsWith("[") && ip.endsWith("]")) {
            ip = ip.substring(1, ip.length() - 1);
        }

        if (ip.contains(".")) {
            String[] octets = ip.split("\\.", -1);
            if (octets.length != 4) {
                return null;
            }
            byte[] address = new byte[4];
            try {
                for (int i = 0; i < octets.length; i++) {
                    if (octets[i].isEmpty() || !octets[i].chars().allMatch(Character::isDigit)) {
                        return null;
                    }
                    int octet = Integer.parseInt(octets[i]);
                    if (octet < 0 || octet > 255) {
                        return null;
                    }
                    address[i] = (byte) octet;
                }
                return InetAddress.getByAddress(address);
            } catch (NumberFormatException | UnknownHostException ex) {
                return null;
            }
        }

        if (!ip.contains(":") || !ip.matches("[0-9a-fA-F:]+")) {
            return null;
        }
        try {
            return InetAddress.getByName(ip);
        } catch (UnknownHostException ex) {
            return null;
        }
    }
}
