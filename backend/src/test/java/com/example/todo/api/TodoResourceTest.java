package com.example.todo.api;

import com.example.todo.domain.User;
import com.example.todo.testsupport.CurrentUserHolder;
import com.example.todo.testsupport.TestFixtures;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class TodoResourceTest {

    @Inject TestFixtures fixtures;
    @Inject CurrentUserHolder holder;

    User alice;
    User bob;

    @BeforeEach
    void setUp() {
        alice = fixtures.createUser("auth0|alice-t-" + System.nanoTime());
        bob = fixtures.createUser("auth0|bob-t-" + System.nanoTime());
        holder.set(alice);
    }

    private String createTag(String name) {
        return given().contentType("application/json").body(Map.of("name", name))
            .when().post("/api/tags").then().statusCode(201).extract().path("id");
    }

    @Test
    void createDefaultsToMediumAndCompletedFalse() {
        given().contentType("application/json").body(Map.of("title", "buy milk"))
            .when().post("/api/todos")
            .then()
            .statusCode(201)
            .body("id", notNullValue())
            .body("title", equalTo("buy milk"))
            .body("priority", equalTo("MEDIUM"))
            .body("completed", equalTo(false));
    }

    @Test
    void createBlankTitleIs400() {
        given().contentType("application/json").body(Map.of("title", "  "))
            .when().post("/api/todos").then().statusCode(400);
    }

    @Test
    void createWithUnknownTagIs404() {
        given().contentType("application/json")
            .body(Map.of("title", "t", "tagIds", List.of(UUID.randomUUID().toString())))
            .when().post("/api/todos").then().statusCode(404);
    }

    @Test
    void createWithOtherUsersTagIs404() {
        holder.set(bob);
        String bobTag = createTag("bobs");
        holder.set(alice);
        given().contentType("application/json")
            .body(Map.of("title", "t", "tagIds", List.of(bobTag)))
            .when().post("/api/todos").then().statusCode(404);
    }

    @Test
    void createWithOwnedTagsAttachesThem() {
        String id1 = createTag("a");
        String id2 = createTag("b");
        given().contentType("application/json")
            .body(Map.of("title", "tagged", "tagIds", List.of(id1, id2)))
            .when().post("/api/todos")
            .then().statusCode(201)
            .body("tags.name", hasItems("a", "b"));
    }

    @Test
    void getByIdOwnedReturns200() {
        String id = given().contentType("application/json").body(Map.of("title", "x"))
            .when().post("/api/todos").then().extract().path("id");
        given().when().get("/api/todos/" + id).then().statusCode(200);
    }

    @Test
    void getByIdNotOwnedIs404() {
        String id = given().contentType("application/json").body(Map.of("title", "x"))
            .when().post("/api/todos").then().extract().path("id");
        holder.set(bob);
        given().when().get("/api/todos/" + id).then().statusCode(404);
    }

    @Test
    void getUnknownIs404() {
        given().when().get("/api/todos/" + UUID.randomUUID()).then().statusCode(404);
    }

    @Test
    void listScopedToCurrentUser() {
        given().contentType("application/json").body(Map.of("title", "alice-1")).post("/api/todos");
        given().contentType("application/json").body(Map.of("title", "alice-2")).post("/api/todos");
        holder.set(bob);
        given().contentType("application/json").body(Map.of("title", "bob-1")).post("/api/todos");
        given().when().get("/api/todos")
            .then().statusCode(200)
            .body("title", hasItems("bob-1"))
            .body("title", hasSize(1));
    }

    @Test
    void filterByCompleted() {
        String id = given().contentType("application/json").body(Map.of("title", "done"))
            .post("/api/todos").then().extract().path("id");
        given().contentType("application/json").body(Map.of("title", "open"))
            .post("/api/todos");
        given().contentType("application/json").body(Map.of("completed", true))
            .when().patch("/api/todos/" + id + "/completion").then().statusCode(200);
        given().when().get("/api/todos?completed=true")
            .then().body("title", contains("done"));
        given().when().get("/api/todos?completed=false")
            .then().body("title", contains("open"));
    }

    @Test
    void filterByPriority() {
        given().contentType("application/json").body(Map.of("title", "h", "priority", "HIGH")).post("/api/todos");
        given().contentType("application/json").body(Map.of("title", "l", "priority", "LOW")).post("/api/todos");
        given().when().get("/api/todos?priority=HIGH")
            .then().body("title", contains("h"));
    }

    @Test
    void filterByTag() {
        String tag = createTag("filtered");
        given().contentType("application/json")
            .body(Map.of("title", "yes", "tagIds", List.of(tag))).post("/api/todos");
        given().contentType("application/json").body(Map.of("title", "no")).post("/api/todos");
        given().when().get("/api/todos?tag=" + tag)
            .then().body("title", contains("yes"));
    }

    @Test
    void filterByDueRange() {
        given().contentType("application/json")
            .body(Map.of("title", "soon", "dueDate", "2030-01-01")).post("/api/todos");
        given().contentType("application/json")
            .body(Map.of("title", "later", "dueDate", "2030-12-31")).post("/api/todos");
        given().when().get("/api/todos?dueBefore=2030-06-01")
            .then().body("title", contains("soon"));
        given().when().get("/api/todos?dueAfter=2030-06-01")
            .then().body("title", contains("later"));
    }

    @Test
    void invalidDueParamIs400() {
        given().when().get("/api/todos?dueBefore=not-a-date").then().statusCode(400);
    }

    @Test
    void sortByDueDateNullsLast() {
        given().contentType("application/json").body(Map.of("title", "no-due")).post("/api/todos");
        given().contentType("application/json")
            .body(Map.of("title", "early", "dueDate", "2030-01-01")).post("/api/todos");
        given().contentType("application/json")
            .body(Map.of("title", "late", "dueDate", "2030-12-31")).post("/api/todos");
        given().when().get("/api/todos?sort=dueDate")
            .then().body("title", contains("early", "late", "no-due"));
    }

    @Test
    void sortByPriority() {
        given().contentType("application/json").body(Map.of("title", "m", "priority", "MEDIUM")).post("/api/todos");
        given().contentType("application/json").body(Map.of("title", "h", "priority", "HIGH")).post("/api/todos");
        given().contentType("application/json").body(Map.of("title", "l", "priority", "LOW")).post("/api/todos");
        given().when().get("/api/todos?sort=priority")
            .then().body("title", contains("h", "m", "l"));
    }

    @Test
    void updateRefreshesFields() {
        String id = given().contentType("application/json").body(Map.of("title", "orig"))
            .post("/api/todos").then().extract().path("id");
        given().contentType("application/json").body(Map.of(
                "title", "renamed",
                "priority", "HIGH",
                "completed", true
            ))
            .when().put("/api/todos/" + id)
            .then().statusCode(200)
            .body("title", equalTo("renamed"))
            .body("priority", equalTo("HIGH"))
            .body("completed", equalTo(true));
    }

    @Test
    void updateNotOwnedIs404() {
        String id = given().contentType("application/json").body(Map.of("title", "x"))
            .post("/api/todos").then().extract().path("id");
        holder.set(bob);
        given().contentType("application/json").body(Map.of(
                "title", "hacked", "priority", "HIGH", "completed", false
            )).when().put("/api/todos/" + id)
            .then().statusCode(404);
    }

    @Test
    void completionPatch() {
        String id = given().contentType("application/json").body(Map.of("title", "x"))
            .post("/api/todos").then().extract().path("id");
        given().contentType("application/json").body(Map.of("completed", true))
            .when().patch("/api/todos/" + id + "/completion")
            .then().statusCode(200).body("completed", equalTo(true));
    }

    @Test
    void completionPatchNotOwnedIs404() {
        String id = given().contentType("application/json").body(Map.of("title", "x"))
            .post("/api/todos").then().extract().path("id");
        holder.set(bob);
        given().contentType("application/json").body(Map.of("completed", true))
            .when().patch("/api/todos/" + id + "/completion")
            .then().statusCode(404);
    }

    @Test
    void deleteOwn() {
        String id = given().contentType("application/json").body(Map.of("title", "x"))
            .post("/api/todos").then().extract().path("id");
        given().when().delete("/api/todos/" + id).then().statusCode(204);
        given().when().get("/api/todos/" + id).then().statusCode(404);
    }

    @Test
    void deleteNotOwnedIs404() {
        String id = given().contentType("application/json").body(Map.of("title", "x"))
            .post("/api/todos").then().extract().path("id");
        holder.set(bob);
        given().when().delete("/api/todos/" + id).then().statusCode(404);
    }

    @Test
    void deleteUnknownIs404() {
        given().when().delete("/api/todos/" + UUID.randomUUID()).then().statusCode(404);
    }

    @Test
    void deleteTodoDoesNotDeleteItsTags() {
        String tagId = createTag("survives");
        String todoId = given().contentType("application/json")
            .body(Map.of("title", "t", "tagIds", List.of(tagId)))
            .post("/api/todos").then().extract().path("id");
        given().when().delete("/api/todos/" + todoId).then().statusCode(204);
        given().when().get("/api/tags")
            .then().body("name", hasItems("survives"));
    }
}
