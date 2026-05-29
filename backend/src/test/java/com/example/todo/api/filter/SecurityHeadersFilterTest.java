package com.example.todo.api.filter;

import io.quarkus.security.identity.SecurityIdentity;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.core.MultivaluedHashMap;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.UriInfo;
import org.junit.jupiter.api.Test;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Pure-unit coverage of {@link SecurityHeadersFilter} so we exercise every
 * branch (path filtering, anonymous vs authenticated cache-control,
 * putIfAbsent) without spinning up Quarkus.
 */
class SecurityHeadersFilterTest {

    private MultivaluedMap<String, Object> headers;

    private SecurityHeadersFilter filterWithIdentity(SecurityIdentity id) {
        SecurityHeadersFilter f = new SecurityHeadersFilter();
        f.identity = id;
        return f;
    }

    private ContainerRequestContext requestFor(String path) {
        UriInfo uri = mock(UriInfo.class);
        when(uri.getPath()).thenReturn(path);
        when(uri.getAbsolutePath()).thenReturn(URI.create("http://localhost:8080/"));
        ContainerRequestContext req = mock(ContainerRequestContext.class);
        when(req.getUriInfo()).thenReturn(uri);
        return req;
    }

    private ContainerResponseContext responseWithEmptyHeaders() {
        headers = new MultivaluedHashMap<>();
        ContainerResponseContext resp = mock(ContainerResponseContext.class);
        when(resp.getHeaders()).thenReturn(headers);
        return resp;
    }

    private SecurityIdentity anonymous() {
        SecurityIdentity id = mock(SecurityIdentity.class);
        when(id.isAnonymous()).thenReturn(true);
        return id;
    }

    private SecurityIdentity authenticated() {
        SecurityIdentity id = mock(SecurityIdentity.class);
        when(id.isAnonymous()).thenReturn(false);
        return id;
    }

    @Test
    void appliesAllHeadersOnApiPath() {
        filterWithIdentity(anonymous()).filter(requestFor("/api/todos"), responseWithEmptyHeaders());

        assertThat(headers.getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(headers.getFirst("X-Frame-Options")).isEqualTo("DENY");
        assertThat(headers.getFirst("Referrer-Policy")).isEqualTo("no-referrer");
        assertThat(headers.getFirst("Content-Security-Policy"))
            .isEqualTo("default-src 'none'; frame-ancestors 'none'");
        assertThat(headers.getFirst("Strict-Transport-Security"))
            .isEqualTo("max-age=31536000; includeSubDomains");
    }

    @Test
    void anonymousUserScopedPathStillGetsNoStore() {
        filterWithIdentity(anonymous()).filter(requestFor("/api/todos"), responseWithEmptyHeaders());
        assertThat(headers.getFirst("Cache-Control")).isEqualTo("no-store");
    }

    @Test
    void healthEndpointDoesNotGetNoStore() {
        filterWithIdentity(anonymous()).filter(requestFor("/api/health"), responseWithEmptyHeaders());
        assertThat(headers.containsKey("Cache-Control")).isFalse();
    }

    @Test
    void qHealthGetsSecurityHeadersWithoutNoStore() {
        filterWithIdentity(anonymous()).filter(requestFor("/q/health/live"), responseWithEmptyHeaders());
        assertThat(headers.getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(headers.containsKey("Cache-Control")).isFalse();
    }

    @Test
    void authenticatedAlwaysGetsNoStore() {
        filterWithIdentity(authenticated()).filter(requestFor("/api/todos"), responseWithEmptyHeaders());
        assertThat(headers.getFirst("Cache-Control")).isEqualTo("no-store");
    }

    @Test
    void nullIdentityFallsBackToPathBasedCacheControl() {
        filterWithIdentity(null).filter(requestFor("/api/todos"), responseWithEmptyHeaders());
        assertThat(headers.getFirst("Cache-Control")).isEqualTo("no-store");
    }

    @Test
    void unrelatedPathIsLeftUntouched() {
        filterWithIdentity(authenticated()).filter(requestFor("/static/index.html"), responseWithEmptyHeaders());
        assertThat(headers).isEmpty();
    }

    @Test
    void nullPathIsTreatedAsUnrelated() {
        filterWithIdentity(authenticated()).filter(requestFor(null), responseWithEmptyHeaders());
        assertThat(headers).isEmpty();
    }

    @Test
    void existingHeadersAreNotOverwritten() {
        ContainerResponseContext resp = responseWithEmptyHeaders();
        headers.putSingle("X-Frame-Options", "SAMEORIGIN");
        headers.putSingle("Cache-Control", "max-age=60");

        filterWithIdentity(authenticated()).filter(requestFor("/api/todos"), resp);

        assertThat(headers.getFirst("X-Frame-Options")).isEqualTo("SAMEORIGIN");
        assertThat(headers.getFirst("Cache-Control")).isEqualTo("max-age=60");
    }

    @Test
    void pathWithoutLeadingSlashIsNormalised() {
        filterWithIdentity(authenticated()).filter(requestFor("api/todos"), responseWithEmptyHeaders());
        assertThat(headers.getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(headers.getFirst("Cache-Control")).isEqualTo("no-store");
    }
}
