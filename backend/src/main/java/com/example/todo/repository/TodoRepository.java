package com.example.todo.repository;

import com.example.todo.domain.Priority;
import com.example.todo.domain.Todo;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class TodoRepository implements PanacheRepositoryBase<Todo, UUID> {

    public Optional<Todo> findByIdForUser(UUID id, UUID userId) {
        return find("id = ?1 and user.id = ?2", id, userId).firstResultOptional();
    }

    /**
     * Filtered, sorted query that fetch-joins tags to avoid the N+1 on the
     * todo→tags association.  Sort options:
     *   - createdAt (default) : created_at DESC
     *   - dueDate             : due_date ASC NULLS LAST, created_at DESC
     *   - priority            : HIGH→MEDIUM→LOW, created_at DESC
     */
    public List<Todo> search(UUID userId,
                             Boolean completed,
                             Priority priority,
                             UUID tagId,
                             LocalDate dueBefore,
                             LocalDate dueAfter,
                             String sort) {
        StringBuilder jpql = new StringBuilder(
            "select t from Todo t " +
            "left join fetch t.tags " +
            "where t.user.id = :userId "
        );
        var params = new java.util.HashMap<String, Object>();
        params.put("userId", userId);

        if (completed != null) {
            jpql.append("and t.completed = :completed ");
            params.put("completed", completed);
        }
        if (priority != null) {
            jpql.append("and t.priority = :priority ");
            params.put("priority", priority);
        }
        if (tagId != null) {
            jpql.append("and exists (select 1 from t.tags tg where tg.id = :tagId) ");
            params.put("tagId", tagId);
        }
        if (dueBefore != null) {
            jpql.append("and t.dueDate <= :dueBefore ");
            params.put("dueBefore", dueBefore);
        }
        if (dueAfter != null) {
            jpql.append("and t.dueDate >= :dueAfter ");
            params.put("dueAfter", dueAfter);
        }

        String order = switch (sort == null ? "createdAt" : sort) {
            case "dueDate" -> "order by t.dueDate asc nulls last, t.createdAt desc";
            case "priority" -> "order by case t.priority when 'HIGH' then 0 when 'MEDIUM' then 1 else 2 end, t.createdAt desc";
            default -> "order by t.createdAt desc";
        };
        jpql.append(order);

        var query = getEntityManager().createQuery(jpql.toString(), Todo.class);
        params.forEach(query::setParameter);
        // Fetch-join on todo→tags produces row duplicates; dedupe in-memory
        // while preserving the SQL ORDER BY result order.
        var seen = new java.util.LinkedHashMap<UUID, Todo>();
        for (Todo t : query.getResultList()) {
            seen.putIfAbsent(t.id, t);
        }
        return new java.util.ArrayList<>(seen.values());
    }
}
