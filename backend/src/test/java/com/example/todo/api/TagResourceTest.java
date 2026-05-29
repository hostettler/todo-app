package com.example.todo.api;

import com.example.todo.domain.User;
import com.example.todo.testsupport.CurrentUserHolder;
import com.example.todo.testsupport.TestFixtures;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class TagResourceTest {

    @Inject
    TestFixtures fixtures;

    @Inject
    CurrentUserHolder holder;

    User alice;
    User bob;

    @BeforeEach
    void setUp() {
        alice = fixtures.createUser("auth0|alice-" + System.nanoTime());
        bob = fixtures.createUser("auth0|bob-" + System.nanoTime());
        holder.set(alice);
    }

    @Test
    void createValidTag() {
        given().contentType("application/json").body(Map.of("name", "work"))
            .when().post("/api/tags")
            .then()
            .statusCode(201)
            .body("id", notNullValue())
            .body("name", equalTo("work"));
    }

    @Test
    void createBlankNameIs400() {
        given().contentType("application/json").body(Map.of("name", "  "))
            .when().post("/api/tags")
            .then().statusCode(400);
    }

    @Test
    void createMissingNameIs400() {
        given().contentType("application/json").body(Map.of())
            .when().post("/api/tags")
            .then().statusCode(400);
    }

    @Test
    void createDuplicateSameUserIs409() {
        given().contentType("application/json").body(Map.of("name", "dup"))
            .when().post("/api/tags").then().statusCode(201);
        given().contentType("application/json").body(Map.of("name", "dup"))
            .when().post("/api/tags").then().statusCode(409);
    }

    @Test
    void sameNameDifferentUsersBothSucceed() {
        given().contentType("application/json").body(Map.of("name", "personal"))
            .when().post("/api/tags").then().statusCode(201);
        holder.set(bob);
        given().contentType("application/json").body(Map.of("name", "personal"))
            .when().post("/api/tags").then().statusCode(201);
    }

    @Test
    void listSortedByName() {
        for (String n : new String[] { "zeta", "alpha", "mike" }) {
            given().contentType("application/json").body(Map.of("name", n))
                .when().post("/api/tags").then().statusCode(201);
        }
        given().when().get("/api/tags")
            .then().statusCode(200)
            .body("name", contains("alpha", "mike", "zeta"));
    }

    @Test
    void listDoesNotLeakOtherUsersTags() {
        given().contentType("application/json").body(Map.of("name", "alice-only"))
            .when().post("/api/tags").then().statusCode(201);
        holder.set(bob);
        given().contentType("application/json").body(Map.of("name", "bob-only"))
            .when().post("/api/tags").then().statusCode(201);
        given().when().get("/api/tags")
            .then().statusCode(200)
            .body("name", hasItems("bob-only"))
            .body("name", hasSize(1));
    }

    @Test
    void renameSuccess() {
        String id = given().contentType("application/json").body(Map.of("name", "old"))
            .when().post("/api/tags").then().statusCode(201)
            .extract().path("id");
        given().contentType("application/json").body(Map.of("name", "new"))
            .when().put("/api/tags/" + id)
            .then().statusCode(200)
            .body("name", equalTo("new"));
    }

    @Test
    void renameNotOwnedIs404() {
        String id = given().contentType("application/json").body(Map.of("name", "alice-tag"))
            .when().post("/api/tags").then().extract().path("id");
        holder.set(bob);
        given().contentType("application/json").body(Map.of("name", "new"))
            .when().put("/api/tags/" + id)
            .then().statusCode(404);
    }

    @Test
    void renameToExistingNameIs409() {
        given().contentType("application/json").body(Map.of("name", "a")).post("/api/tags");
        String id = given().contentType("application/json").body(Map.of("name", "b"))
            .post("/api/tags").then().extract().path("id");
        given().contentType("application/json").body(Map.of("name", "a"))
            .when().put("/api/tags/" + id)
            .then().statusCode(409);
    }

    @Test
    void renameToBlankIs400() {
        String id = given().contentType("application/json").body(Map.of("name", "x"))
            .post("/api/tags").then().extract().path("id");
        given().contentType("application/json").body(Map.of("name", " "))
            .when().put("/api/tags/" + id)
            .then().statusCode(400);
    }

    @Test
    void deleteOwn() {
        String id = given().contentType("application/json").body(Map.of("name", "del"))
            .post("/api/tags").then().extract().path("id");
        given().when().delete("/api/tags/" + id).then().statusCode(204);
        given().when().get("/api/tags")
            .then().body("name", hasSize(0));
    }

    @Test
    void deleteNotOwnedIs404() {
        String id = given().contentType("application/json").body(Map.of("name", "x"))
            .post("/api/tags").then().extract().path("id");
        holder.set(bob);
        given().when().delete("/api/tags/" + id).then().statusCode(404);
    }

    @Test
    void deleteUnknownIs404() {
        given().when().delete("/api/tags/" + UUID.randomUUID()).then().statusCode(404);
    }
}
