package com.example.todo.auth;

import com.example.todo.domain.User;
import com.example.todo.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.hibernate.exception.ConstraintViolationException;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Resolves the application user for a JWT subject, lazily creating the
 * {@code users} row on the first request from a previously unseen subject.
 *
 * <p>Concurrent first requests are handled by retrying once on the
 * {@code auth_subject} unique-constraint violation (authentication spec,
 * task 5.3).
 */
@ApplicationScoped
public class UserProvisioning {

    @Inject
    UserRepository userRepository;

    @Transactional
    public User resolveOrCreate(String subject, String email) {
        Optional<User> existing = userRepository.findByAuthSubject(subject);
        if (existing.isPresent()) {
            return existing.get();
        }
        try {
            User u = new User(UUID.randomUUID(), subject, email);
            u.createdAt = OffsetDateTime.now();
            userRepository.persistAndFlush(u);
            return u;
        } catch (Exception e) {
            if (isUniqueViolation(e)) {
                return userRepository.findByAuthSubject(subject)
                    .orElseThrow(() -> new IllegalStateException(
                        "User row should exist after unique-constraint conflict", e));
            }
            throw e;
        }
    }

    private static boolean isUniqueViolation(Throwable t) {
        for (Throwable cur = t; cur != null; cur = cur.getCause()) {
            if (cur instanceof ConstraintViolationException) {
                return true;
            }
        }
        return false;
    }
}
