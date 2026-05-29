package com.example.todo.api;

import com.example.todo.api.dto.UserDto;
import com.example.todo.auth.CurrentUser;
import com.example.todo.domain.User;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api/me")
@Produces(MediaType.APPLICATION_JSON)
public class MeResource {

    @Inject
    CurrentUser currentUser;

    @GET
    public UserDto me() {
        User u = currentUser.get();
        return new UserDto(u.id, u.authSubject, u.email);
    }
}
