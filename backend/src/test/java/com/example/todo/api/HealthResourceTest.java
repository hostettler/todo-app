package com.example.todo.api;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class HealthResourceTest {

    @Test
    void returnsStatusUp() {
        given()
            .when().get("/api/health")
            .then()
            .statusCode(200)
            .body("status", equalTo("UP"))
            .header("X-Content-Type-Options", equalTo("nosniff"))
            .header("X-Frame-Options", equalTo("DENY"))
            .header("Referrer-Policy", equalTo("no-referrer"))
            .header("Content-Security-Policy", equalTo("default-src 'none'; frame-ancestors 'none'"))
            .header("Strict-Transport-Security", equalTo("max-age=31536000; includeSubDomains"));
    }
}
