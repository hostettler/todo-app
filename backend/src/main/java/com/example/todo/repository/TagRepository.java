package com.example.todo.repository;

import com.example.todo.domain.Tag;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class TagRepository implements PanacheRepositoryBase<Tag, UUID> {

    public List<Tag> listForUser(UUID userId) {
        return find("user.id = ?1", Sort.by("name"), userId).list();
    }

    public Optional<Tag> findByIdForUser(UUID id, UUID userId) {
        return find("id = ?1 and user.id = ?2", id, userId).firstResultOptional();
    }

    public Optional<Tag> findByNameForUser(String name, UUID userId) {
        return find("name = ?1 and user.id = ?2", name, userId).firstResultOptional();
    }

    public List<Tag> findAllByIdsForUser(Set<UUID> ids, UUID userId) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return find("id in ?1 and user.id = ?2", ids, userId).list();
    }
}
