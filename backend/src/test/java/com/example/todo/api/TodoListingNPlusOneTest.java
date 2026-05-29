package com.example.todo.api;

import com.example.todo.domain.Tag;
import com.example.todo.domain.Todo;
import com.example.todo.domain.User;
import com.example.todo.repository.TagRepository;
import com.example.todo.repository.TodoRepository;
import com.example.todo.testsupport.CurrentUserHolder;
import com.example.todo.testsupport.TestFixtures;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.hibernate.Session;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import jakarta.persistence.EntityManager;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Asserts that listing todos with their tags does not trigger the N+1
 * pattern.  The {@code TodoRepository.search} method must fetch-join tags
 * so a single SELECT covers all rows.
 */
@QuarkusTest
class TodoListingNPlusOneTest {

    @Inject TestFixtures fixtures;
    @Inject CurrentUserHolder holder;
    @Inject TodoRepository todoRepository;
    @Inject TagRepository tagRepository;
    @Inject EntityManager em;

    User user;

    @BeforeEach
    void setUp() {
        user = fixtures.createUser("auth0|np1-" + System.nanoTime());
        holder.set(user);
        seed(10);
    }

    @Transactional
    void seed(int n) {
        for (int i = 0; i < n; i++) {
            Tag t1 = new Tag(UUID.randomUUID(), user, "t1-" + i + "-" + UUID.randomUUID());
            Tag t2 = new Tag(UUID.randomUUID(), user, "t2-" + i + "-" + UUID.randomUUID());
            tagRepository.persist(t1);
            tagRepository.persist(t2);
            Todo todo = new Todo();
            todo.id = UUID.randomUUID();
            todo.user = user;
            todo.title = "n+1 #" + i;
            todo.priority = com.example.todo.domain.Priority.MEDIUM;
            todo.createdAt = OffsetDateTime.now();
            todo.updatedAt = OffsetDateTime.now();
            todo.tags = new HashSet<>(List.of(t1, t2));
            todoRepository.persist(todo);
        }
    }

    @Test
    void listDoesNotIssueOneQueryPerTodo() {
        Session session = em.unwrap(Session.class);
        Statistics stats = session.getSessionFactory().getStatistics();
        stats.setStatisticsEnabled(true);
        stats.clear();

        given().when().get("/api/todos").then().statusCode(200);

        long queries = stats.getPrepareStatementCount();
        // Allow a small constant for tx/setup queries; the key signal is that
        // we are NOT issuing one query per todo (which would be > seed count).
        assertThat(queries)
            .as("Listing todos must use a fetch-join, not N+1")
            .isLessThanOrEqualTo(5);
    }
}
