package com.example.todo.api;

import com.example.todo.api.dto.TagDto;
import com.example.todo.auth.CurrentUser;
import com.example.todo.domain.Tag;
import com.example.todo.repository.TagRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;

import java.util.List;
import java.util.UUID;

@Path("/api/tags")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TagResource {

    @Inject
    CurrentUser currentUser;

    @Inject
    TagRepository tagRepository;

    @GET
    public List<TagDto> list() {
        UUID userId = currentUser.id();
        return tagRepository.listForUser(userId).stream()
            .map(t -> new TagDto(t.id, t.name))
            .toList();
    }

    @POST
    @Transactional
    public Response create(@Valid TagDto.CreateRequest body) {
        String name = body.name().trim();
        if (name.isEmpty()) {
            throw new WebApplicationException(Status.BAD_REQUEST);
        }
        UUID userId = currentUser.id();
        if (tagRepository.findByNameForUser(name, userId).isPresent()) {
            throw new WebApplicationException(Status.CONFLICT);
        }
        Tag tag = new Tag(UUID.randomUUID(), currentUser.get(), name);
        tagRepository.persist(tag);
        return Response.status(Status.CREATED).entity(new TagDto(tag.id, tag.name)).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public TagDto rename(@PathParam("id") UUID id, @Valid TagDto.RenameRequest body) {
        UUID userId = currentUser.id();
        Tag tag = tagRepository.findByIdForUser(id, userId)
            .orElseThrow(() -> new WebApplicationException(Status.NOT_FOUND));
        String newName = body.name().trim();
        if (newName.isEmpty()) {
            throw new WebApplicationException(Status.BAD_REQUEST);
        }
        if (!newName.equals(tag.name)
            && tagRepository.findByNameForUser(newName, userId).isPresent()) {
            throw new WebApplicationException(Status.CONFLICT);
        }
        tag.name = newName;
        return new TagDto(tag.id, tag.name);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        UUID userId = currentUser.id();
        Tag tag = tagRepository.findByIdForUser(id, userId)
            .orElseThrow(() -> new WebApplicationException(Status.NOT_FOUND));
        tagRepository.delete(tag);
        return Response.noContent().build();
    }
}
