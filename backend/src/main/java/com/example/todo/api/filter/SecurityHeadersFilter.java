package com.example.todo.api.filter;

import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.ext.Provider;

/**
 * Sets the security headers required by the api-security spec on every
 * response from {@code /api/**} and {@code /q/health*}.  Applied to all
 * responses, including errors, as defense in depth alongside Cloudflare and
 * the ingress.
 */
@Provider
public class SecurityHeadersFilter implements ContainerResponseFilter {

    @Inject
    SecurityIdentity identity;

    @Override
    public void filter(ContainerRequestContext request, ContainerResponseContext response) {
        String path = request.getUriInfo().getPath();
        if (!shouldApply(path)) {
            return;
        }
        MultivaluedMap<String, Object> h = response.getHeaders();
        putIfAbsent(h, "X-Content-Type-Options", "nosniff");
        putIfAbsent(h, "X-Frame-Options", "DENY");
        putIfAbsent(h, "Referrer-Policy", "no-referrer");
        putIfAbsent(h, "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
        putIfAbsent(h, "Strict-Transport-Security", "max-age=31536000; includeSubDomains");

        if (identity != null && !identity.isAnonymous()) {
            putIfAbsent(h, "Cache-Control", "no-store");
        } else if (isUserScoped(path)) {
            // Anonymous test mode still serves user-scoped data; never let it
            // be cached by intermediaries.
            putIfAbsent(h, "Cache-Control", "no-store");
        }
    }

    private static boolean isUserScoped(String path) {
        if (path == null) return false;
        String n = path.startsWith("/") ? path : "/" + path;
        return n.startsWith("/api/") && !n.startsWith("/api/health");
    }

    private static boolean shouldApply(String path) {
        if (path == null) {
            return false;
        }
        String normalized = path.startsWith("/") ? path : "/" + path;
        return normalized.startsWith("/api/")
            || normalized.startsWith("/q/health");
    }

    private static void putIfAbsent(MultivaluedMap<String, Object> h, String name, String value) {
        if (!h.containsKey(name)) {
            h.putSingle(name, value);
        }
    }
}
