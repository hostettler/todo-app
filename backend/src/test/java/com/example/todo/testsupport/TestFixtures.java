package com.example.todo.testsupport;

import com.example.todo.domain.User;
import com.example.todo.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@ApplicationScoped
public class TestFixtures {

    @Inject
    UserRepository userRepository;

    @Transactional
    public User createUser(String subject) {
        return createUser(subject, subject + "@example.com");
    }

    @Transactional
    public User createUser(String subject, String email) {
        User u = new User(UUID.randomUUID(), subject, email);
        u.createdAt = OffsetDateTime.now();
        userRepository.persist(u);
        return u;
    }
}
