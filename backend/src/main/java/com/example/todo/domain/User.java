package com.example.todo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    public UUID id;

    @Column(name = "auth_subject", nullable = false, unique = true)
    public String authSubject;

    @Column(name = "email")
    public String email;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    public User() {
    }

    public User(UUID id, String authSubject, String email) {
        this.id = id;
        this.authSubject = authSubject;
        this.email = email;
        this.createdAt = OffsetDateTime.now();
    }
}
