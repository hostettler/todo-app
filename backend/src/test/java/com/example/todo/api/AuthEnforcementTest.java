package com.example.todo.api;

import com.example.todo.domain.User;
import com.example.todo.testsupport.CurrentUserHolder;
import com.example.todo.testsupport.TestFixtures;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

/**
 * Exercises the authenticated permission policy on /api/*: missing or invalid
 * tokens must be rejected with 401, while requests carrying a valid security
 * identity reach the resource and return 200.
 *
 * <p>The {@link AuthEnabledProfile} flips the api permission policy back to
 * {@code authenticated} (the production default) — the base test profile in
 * {@code application.properties} sets it to {@code permit} so most tests can
 * focus on business logic without an OIDC backend.</p>
 */
@QuarkusTest
@TestProfile(AuthEnforcementTest.AuthEnabledProfile.class)
class AuthEnforcementTest {

    public static class AuthEnabledProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                "quarkus.http.auth.permission.api.policy", "authenticated"
            );
        }
    }

    @Inject TestFixtures fixtures;
    @Inject CurrentUserHolder holder;

    User user;

    @BeforeEach
    void setUp() {
        user = fixtures.createUser("auth0|enforced-" + System.nanoTime());
        holder.set(user);
    }

    @Test
    void rejectsRequestWithoutAuthorizationHeader() {
        given()
            .when().get("/api/me")
            .then()
            .statusCode(401);
    }

    @Test
    void rejectsRequestWithInvalidBearerToken() {
        given()
            .header("Authorization", "Bearer not-a-real-jwt")
            .when().get("/api/me")
            .then()
            .statusCode(401);
    }

    @Test
    @TestSecurity(user = "auth0|enforced", roles = "user")
    void allowsRequestWithValidSecurityIdentity() {
        given()
            .when().get("/api/me")
            .then()
            .statusCode(200)
            .body("authSubject", equalTo(user.authSubject))
            .header("Cache-Control", equalTo("no-store"));
    }
}
