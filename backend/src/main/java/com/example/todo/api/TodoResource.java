package com.example.todo.api;

import com.example.todo.api.dto.TagDto;
import com.example.todo.api.dto.TodoDto;
import com.example.todo.auth.CurrentUser;
import com.example.todo.domain.Priority;
import com.example.todo.domain.Tag;
import com.example.todo.domain.Todo;
import com.example.todo.repository.TagRepository;
import com.example.todo.repository.TodoRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Path("/api/todos")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TodoResource {

    @Inject
    CurrentUser currentUser;

    @Inject
    TodoRepository todoRepository;

    @Inject
    TagRepository tagRepository;

    @GET
    public List<TodoDto> list(@QueryParam("completed") Boolean completed,
                              @QueryParam("priority") Priority priority,
                              @QueryParam("tag") UUID tagId,
                              @QueryParam("dueBefore") String dueBefore,
                              @QueryParam("dueAfter") String dueAfter,
                              @QueryParam("sort") String sort) {
        UUID userId = currentUser.id();
        LocalDate before = parseDate(dueBefore);
        LocalDate after = parseDate(dueAfter);
        return todoRepository.search(userId, completed, priority, tagId, before, after, sort).stream()
            .map(TodoResource::toDto)
            .toList();
    }

    @GET
    @Path("/{id}")
    public TodoDto get(@PathParam("id") UUID id) {
        UUID userId = currentUser.id();
        Todo todo = todoRepository.findByIdForUser(id, userId)
            .orElseThrow(() -> new WebApplicationException(Status.NOT_FOUND));
        return toDto(todo);
    }

    @POST
    @Transactional
    public Response create(@Valid TodoDto.CreateRequest body) {
        UUID userId = currentUser.id();
        Todo todo = new Todo();
        todo.id = UUID.randomUUID();
        todo.user = currentUser.get();
        todo.title = body.title().trim();
        todo.description = body.description();
        todo.dueDate = body.dueDate();
        todo.priority = body.priority() == null ? Priority.MEDIUM : body.priority();
        todo.completed = false;
        OffsetDateTime now = OffsetDateTime.now();
        todo.createdAt = now;
        todo.updatedAt = now;
        todo.tags = resolveTags(body.tagIds(), userId);
        todoRepository.persist(todo);
        return Response.status(Status.CREATED).entity(toDto(todo)).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public TodoDto update(@PathParam("id") UUID id, @Valid TodoDto.UpdateRequest body) {
        UUID userId = currentUser.id();
        Todo todo = todoRepository.findByIdForUser(id, userId)
            .orElseThrow(() -> new WebApplicationException(Status.NOT_FOUND));
        todo.title = body.title().trim();
        todo.description = body.description();
        todo.dueDate = body.dueDate();
        todo.priority = body.priority();
        todo.completed = body.completed();
        todo.tags = resolveTags(body.tagIds(), userId);
        todo.updatedAt = OffsetDateTime.now();
        return toDto(todo);
    }

    @PATCH
    @Path("/{id}/completion")
    @Transactional
    public TodoDto setCompletion(@PathParam("id") UUID id, @Valid TodoDto.CompletionRequest body) {
        UUID userId = currentUser.id();
        Todo todo = todoRepository.findByIdForUser(id, userId)
            .orElseThrow(() -> new WebApplicationException(Status.NOT_FOUND));
        todo.completed = body.completed();
        todo.updatedAt = OffsetDateTime.now();
        return toDto(todo);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        UUID userId = currentUser.id();
        Todo todo = todoRepository.findByIdForUser(id, userId)
            .orElseThrow(() -> new WebApplicationException(Status.NOT_FOUND));
        todoRepository.delete(todo);
        return Response.noContent().build();
    }

    private Set<Tag> resolveTags(Set<UUID> ids, UUID userId) {
        if (ids == null || ids.isEmpty()) {
            return new HashSet<>();
        }
        List<Tag> found = tagRepository.findAllByIdsForUser(ids, userId);
        if (found.size() != ids.size()) {
            // At least one tag id either doesn't exist or isn't owned by this
            // user — treat the whole request as a not-found to avoid leaking
            // which tag is missing vs not-owned.
            throw new WebApplicationException(Status.NOT_FOUND);
        }
        return new HashSet<>(found);
    }

    private static TodoDto toDto(Todo t) {
        List<TagDto> tagDtos = t.tags.stream()
            .map(tg -> new TagDto(tg.id, tg.name))
            .toList();
        return new TodoDto(
            t.id, t.title, t.description, t.dueDate, t.priority, t.completed,
            t.createdAt, t.updatedAt, tagDtos
        );
    }

    private static LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(s);
        } catch (Exception e) {
            throw new WebApplicationException(Status.BAD_REQUEST);
        }
    }
}
