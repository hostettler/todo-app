package com.example.todo.api.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record TagDto(UUID id, String name) {

    public record CreateRequest(@NotBlank String name) {
    }

    public record RenameRequest(@NotBlank String name) {
    }
}
