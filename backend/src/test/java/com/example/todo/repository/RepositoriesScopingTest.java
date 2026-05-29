package com.example.todo.repository;

import com.example.todo.domain.Tag;
import com.example.todo.domain.User;
import com.example.todo.testsupport.TestFixtures;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
class RepositoriesScopingTest {

    @Inject TestFixtures fixtures;
    @Inject UserRepository userRepository;
    @Inject TagRepository tagRepository;

    @Test
    void findByAuthSubjectMatches() {
        User u = fixtures.createUser("auth0|repo-" + System.nanoTime());
        assertThat(userRepository.findByAuthSubject(u.authSubject))
            .isPresent()
            .map(found -> found.id)
            .contains(u.id);
        assertThat(userRepository.findByAuthSubject("auth0|nobody")).isEmpty();
    }

    @Test
    @Transactional
    void tagFindersAreUserScoped() {
        User a = fixtures.createUser("auth0|ra-" + System.nanoTime());
        User b = fixtures.createUser("auth0|rb-" + System.nanoTime());
        Tag t1 = new Tag(UUID.randomUUID(), a, "shared");
        Tag t2 = new Tag(UUID.randomUUID(), b, "shared");
        tagRepository.persist(t1);
        tagRepository.persist(t2);

        assertThat(tagRepository.listForUser(a.id)).extracting(x -> x.id).contains(t1.id).doesNotContain(t2.id);
        assertThat(tagRepository.findByIdForUser(t1.id, a.id)).isPresent();
        assertThat(tagRepository.findByIdForUser(t1.id, b.id)).isEmpty();
        assertThat(tagRepository.findByNameForUser("shared", a.id)).map(x -> x.id).contains(t1.id);
        assertThat(tagRepository.findByNameForUser("shared", b.id)).map(x -> x.id).contains(t2.id);
        assertThat(tagRepository.findAllByIdsForUser(Set.of(t1.id, t2.id), a.id)).hasSize(1);
        assertThat(tagRepository.findAllByIdsForUser(Set.of(), a.id)).isEmpty();
    }
}
