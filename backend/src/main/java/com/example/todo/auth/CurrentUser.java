package com.example.todo.auth;

import com.example.todo.domain.User;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.NotAuthorizedException;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.UUID;

/**
 * Per-request facade that resolves the current authenticated user from the
 * JWT {@code sub} claim and caches the result for the duration of the
 * request.  The actual lazy-provisioning logic lives in
 * {@link UserProvisioning} so it can be tested independently.
 */
@RequestScoped
public class CurrentUser {

    @Inject
    JsonWebToken jwt;

    @Inject
    SecurityIdentity identity;

    @Inject
    UserProvisioning userProvisioning;

    private User cached;

    @PermitAll
    public User get() {
        if (cached != null) {
            return cached;
        }
        String subject = subject();
        cached = userProvisioning.resolveOrCreate(subject, claimEmail());
        return cached;
    }

    public UUID id() {
        return get().id;
    }

    public String subject() {
        if (identity == null || identity.isAnonymous() || jwt == null || jwt.getSubject() == null) {
            throw new NotAuthorizedException("No authenticated subject");
        }
        return jwt.getSubject();
    }

    private String claimEmail() {
        if (jwt == null) {
            return null;
        }
        Object claim = jwt.getClaim("email");
        return claim == null ? null : claim.toString();
    }
}

