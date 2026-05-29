package com.example.todo.api.dto;

import com.example.todo.domain.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public record TodoDto(
    UUID id,
    String title,
    String description,
    LocalDate dueDate,
    Priority priority,
    boolean completed,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    List<TagDto> tags
) {
    public record CreateRequest(
        @NotBlank String title,
        String description,
        LocalDate dueDate,
        Priority priority,
        Set<UUID> tagIds
    ) {
    }

    public record UpdateRequest(
        @NotBlank String title,
        String description,
        LocalDate dueDate,
        @NotNull Priority priority,
        boolean completed,
        Set<UUID> tagIds
    ) {
    }

    public record CompletionRequest(@NotNull Boolean completed) {
    }
}
