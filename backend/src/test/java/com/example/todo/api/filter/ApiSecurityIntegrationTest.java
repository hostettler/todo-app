package com.example.todo.api.filter;

import com.example.todo.domain.User;
import com.example.todo.testsupport.CurrentUserHolder;
import com.example.todo.testsupport.TestFixtures;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

/**
 * End-to-end CORS + security-headers assertions against the running Quarkus
 * test instance.  Covers task 12.7 of the add-todo-app change.
 */
@QuarkusTest
class ApiSecurityIntegrationTest {

    private static final String ALLOWED_ORIGIN = "http://localhost:5173";
    private static final String DISALLOWED_ORIGIN = "https://evil.example.com";

    @Inject TestFixtures fixtures;
    @Inject CurrentUserHolder holder;

    User user;

    @BeforeEach
    void setUp() {
        user = fixtures.createUser("auth0|sec-" + System.nanoTime());
        holder.set(user);
    }

    @Test
    void allowedOriginGetsCorsHeader() {
        given()
            .header("Origin", ALLOWED_ORIGIN)
            .when().get("/api/health")
            .then()
            .statusCode(200)
            .header("Access-Control-Allow-Origin", equalTo(ALLOWED_ORIGIN));
    }

    @Test
    void preflightFromAllowedOriginReturnsExpectedHeaders() {
        given()
            .header("Origin", ALLOWED_ORIGIN)
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Headers", "Authorization,Content-Type")
            .when().options("/api/todos")
            .then()
            .statusCode(Matchers.anyOf(equalTo(200), equalTo(204)))
            .header("Access-Control-Allow-Origin", equalTo(ALLOWED_ORIGIN))
            .header("Access-Control-Allow-Methods", containsString("POST"))
            .header("Access-Control-Allow-Headers", containsString("Authorization"))
            .header("Access-Control-Allow-Headers", containsString("Content-Type"))
            .header("Access-Control-Max-Age", Matchers.notNullValue());
    }

    @Test
    void disallowedOriginGetsNoAllowOriginHeader() {
        given()
            .header("Origin", DISALLOWED_ORIGIN)
            .when().get("/api/health")
            .then()
            .header("Access-Control-Allow-Origin", nullValue())
            .header("Access-Control-Allow-Credentials", nullValue());
    }

    @Test
    void securityHeadersPresentOn2xx() {
        given()
            .when().get("/api/health")
            .then()
            .statusCode(200)
            .header("X-Content-Type-Options", equalTo("nosniff"))
            .header("X-Frame-Options", equalTo("DENY"))
            .header("Referrer-Policy", equalTo("no-referrer"))
            .header("Content-Security-Policy", equalTo("default-src 'none'; frame-ancestors 'none'"))
            .header("Strict-Transport-Security", equalTo("max-age=31536000; includeSubDomains"));
    }

    @Test
    void securityHeadersPresentOn4xx() {
        // Hit a resource path that maps to JAX-RS and returns 404 from inside
        // the application (rather than the Vert.x router default 404).
        given()
            .when().get("/api/todos/00000000-0000-0000-0000-000000000000")
            .then()
            .statusCode(404)
            .header("X-Content-Type-Options", equalTo("nosniff"))
            .header("X-Frame-Options", equalTo("DENY"))
            .header("Referrer-Policy", equalTo("no-referrer"))
            .header("Content-Security-Policy", equalTo("default-src 'none'; frame-ancestors 'none'"))
            .header("Strict-Transport-Security", equalTo("max-age=31536000; includeSubDomains"));
    }

    @Test
    void cacheControlNoStoreOnAuthenticatedApiResponses() {
        given()
            .when().get("/api/todos")
            .then()
            .statusCode(200)
            .header("Cache-Control", equalTo("no-store"));
    }

    @Test
    void spoofedForwardedHeadersFromUntrustedSourceAreIgnored() {
        given()
            .header("X-Forwarded-For", "203.0.113.5")
            .header("X-Forwarded-Proto", "https")
            .header("CF-Connecting-IP", "203.0.113.5")
            .when().get("/api/health")
            .then()
            .statusCode(200)
            .body("status", equalTo("UP"));
    }

    @Test
    void liveHealthReturnsOnlyStatusJson() {
        given()
            .when().get("/q/health/live")
            .then()
            .statusCode(200)
            .body("status", equalTo("UP"))
            .body("$", Matchers.not(Matchers.hasKey("version")))
            .body("$", Matchers.not(Matchers.hasKey("hostname")))
            .body("$", Matchers.not(Matchers.hasKey("driver")));
    }

    @Test
    void readyHealthReturnsOnlyStatusJson() {
        given()
            .when().get("/q/health/ready")
            .then()
            .statusCode(Matchers.anyOf(equalTo(200), equalTo(503)))
            .body("status", Matchers.notNullValue());
    }
}
