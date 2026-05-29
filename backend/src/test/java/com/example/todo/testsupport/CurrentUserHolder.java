package com.example.todo.testsupport;

import com.example.todo.domain.User;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Application-scoped holder so REST-layer tests can swap the "current user"
 * between requests without rewiring CDI.
 */
@ApplicationScoped
public class CurrentUserHolder {

    private volatile User user;

    public void set(User user) {
        this.user = user;
    }

    public User user() {
        if (user == null) {
            throw new IllegalStateException(
                "No current test user set — call CurrentUserHolder.set(...) in @BeforeEach");
        }
        return user;
    }
}
