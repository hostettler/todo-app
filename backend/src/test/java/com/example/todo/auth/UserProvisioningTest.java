package com.example.todo.auth;

import com.example.todo.domain.User;
import com.example.todo.repository.UserRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
class UserProvisioningTest {

    @Inject UserProvisioning provisioning;
    @Inject UserRepository userRepository;

    @Test
    void createsUserOnFirstCall() {
        String sub = "auth0|first-" + System.nanoTime();
        User u = provisioning.resolveOrCreate(sub, "first@example.com");
        assertThat(u.id).isNotNull();
        assertThat(u.authSubject).isEqualTo(sub);
        assertThat(u.email).isEqualTo("first@example.com");
        assertThat(userRepository.findByAuthSubject(sub)).isPresent();
    }

    @Test
    void reusesUserOnSecondCall() {
        String sub = "auth0|second-" + System.nanoTime();
        User a = provisioning.resolveOrCreate(sub, "x@example.com");
        User b = provisioning.resolveOrCreate(sub, "y@example.com");
        assertThat(b.id).isEqualTo(a.id);
        // Email is set on creation only; existing user is reused as-is.
        assertThat(b.email).isEqualTo("x@example.com");
    }

    @Test
    void nullEmailIsAccepted() {
        String sub = "auth0|noemail-" + System.nanoTime();
        User u = provisioning.resolveOrCreate(sub, null);
        assertThat(u.email).isNull();
    }
}
