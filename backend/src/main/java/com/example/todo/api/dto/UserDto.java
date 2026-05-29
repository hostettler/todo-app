package com.example.todo.api.dto;

import java.util.UUID;

public record UserDto(UUID id, String authSubject, String email) {
}
