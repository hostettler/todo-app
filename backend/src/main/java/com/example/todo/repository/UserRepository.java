package com.example.todo.repository;

import com.example.todo.domain.User;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class UserRepository implements PanacheRepositoryBase<User, UUID> {

    public Optional<User> findByAuthSubject(String authSubject) {
        return find("authSubject", authSubject).firstResultOptional();
    }
}
