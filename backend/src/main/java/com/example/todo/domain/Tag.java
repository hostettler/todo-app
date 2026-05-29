package com.example.todo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "tags",
    uniqueConstraints = @UniqueConstraint(
        name = "tags_user_name_unique",
        columnNames = { "user_id", "name" }
    )
)
public class Tag {

    @Id
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @Column(name = "name", nullable = false)
    public String name;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    public Tag() {
    }

    public Tag(UUID id, User user, String name) {
        this.id = id;
        this.user = user;
        this.name = name;
        this.createdAt = OffsetDateTime.now();
    }
}
