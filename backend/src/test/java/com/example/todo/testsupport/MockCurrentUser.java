package com.example.todo.testsupport;

import com.example.todo.auth.CurrentUser;
import com.example.todo.domain.User;
import io.quarkus.test.Mock;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;

import java.util.UUID;

/**
 * Test-only override of {@link CurrentUser} that returns a stable, in-memory
 * user identity so REST endpoint tests do not need a real JWT.  The user id /
 * subject can be swapped per-test via {@link CurrentUserHolder}.
 */
@Mock
@RequestScoped
public class MockCurrentUser extends CurrentUser {

    @Inject
    CurrentUserHolder holder;

    @Override
    public User get() {
        return holder.user();
    }

    @Override
    public UUID id() {
        return holder.user().id;
    }

    @Override
    public String subject() {
        return holder.user().authSubject;
    }
}
