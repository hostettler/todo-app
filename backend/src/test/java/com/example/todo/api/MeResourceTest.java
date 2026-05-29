package com.example.todo.api;

import com.example.todo.domain.User;
import com.example.todo.testsupport.CurrentUserHolder;
import com.example.todo.testsupport.TestFixtures;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class MeResourceTest {

    @Inject
    TestFixtures fixtures;

    @Inject
    CurrentUserHolder holder;

    User user;

    @BeforeEach
    void setUp() {
        user = fixtures.createUser("auth0|me-" + System.nanoTime());
        holder.set(user);
    }

    @Test
    void returnsCurrentUserProfile() {
        given()
            .when().get("/api/me")
            .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("authSubject", equalTo(user.authSubject))
            .body("email", equalTo(user.email))
            .header("Cache-Control", equalTo("no-store"));
    }
}
