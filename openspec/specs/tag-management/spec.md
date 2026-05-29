# tag-management Specification

## Purpose
TBD - created by archiving change add-todo-app. Update Purpose after archive.
## Requirements
### Requirement: Create a tag
The backend SHALL allow an authenticated user to create a tag owned by that user via `POST /api/tags` with a required, non-empty, trimmed `name` that is unique per user (case-sensitive).

#### Scenario: Valid create request
- **WHEN** an authenticated user `POST`s `{ "name": "work" }` to `/api/tags` and they do not already own a tag named `work`
- **THEN** the backend responds with HTTP 201 and a JSON body containing the new tag's `id` and `name`

#### Scenario: Missing or blank name
- **WHEN** an authenticated user `POST`s to `/api/tags` with a missing, empty, or whitespace-only `name`
- **THEN** the backend responds with HTTP 400 and does not create a tag

#### Scenario: Duplicate name for the same user
- **WHEN** an authenticated user `POST`s a `name` that they already own
- **THEN** the backend responds with HTTP 409 Conflict

#### Scenario: Same name across different users
- **WHEN** two different authenticated users each `POST` a tag named `work`
- **THEN** both requests succeed and each user owns their own `work` tag

### Requirement: List tags
The backend SHALL return only the authenticated user's tags from `GET /api/tags`, sorted by `name` ascending.

#### Scenario: Listing tags
- **WHEN** an authenticated user calls `GET /api/tags`
- **THEN** the backend returns HTTP 200 with the user's tags sorted by `name` ascending
- **AND** does not return any tag owned by another user

### Requirement: Rename a tag
The backend SHALL allow an authenticated user to rename one of their tags via `PUT /api/tags/{id}` with a new `name`, subject to the per-user uniqueness constraint.

#### Scenario: Owner renames their tag
- **WHEN** an authenticated user `PUT`s `{ "name": "personal" }` to `/api/tags/{id}` for a tag they own, and they do not already own a tag named `personal`
- **THEN** the backend returns HTTP 200 with the updated tag

#### Scenario: New name conflicts with an existing tag of the same user
- **WHEN** the new `name` matches another tag already owned by the user
- **THEN** the backend returns HTTP 409 Conflict

#### Scenario: Rename targets another user's tag
- **WHEN** an authenticated user `PUT`s to `/api/tags/{id}` for a tag owned by another user
- **THEN** the backend returns HTTP 404 and does not modify any data

### Requirement: Delete a tag
The backend SHALL allow an authenticated user to delete one of their tags via `DELETE /api/tags/{id}`, and SHALL also remove every association of that tag with any todo without deleting the todos themselves.

#### Scenario: Owner deletes their tag
- **WHEN** an authenticated user `DELETE`s `/api/tags/{id}` for a tag they own
- **THEN** the backend returns HTTP 204
- **AND** removes the tag and all of its `todo_tags` rows
- **AND** leaves the previously associated todos in place, no longer carrying that tag

#### Scenario: Delete targets another user's tag
- **WHEN** an authenticated user `DELETE`s `/api/tags/{id}` for a tag owned by another user
- **THEN** the backend returns HTTP 404 and does not modify any data

### Requirement: Frontend tag management
The frontend SHALL provide authenticated users a UI to view, create, rename, and delete their tags, and to assign tags when creating or editing a todo.

#### Scenario: Managing tags
- **WHEN** an authenticated user opens the tag management view
- **THEN** the UI lists the user's tags with controls to create a new tag, rename an existing tag, and delete a tag

#### Scenario: Assigning tags to a todo
- **WHEN** the user creates or edits a todo
- **THEN** the UI presents the user's existing tags as selectable options
- **AND** the chosen tag ids are sent to the backend as the todo's `tagIds`

#### Scenario: Conflict feedback on rename
- **WHEN** the backend returns HTTP 409 while renaming a tag
- **THEN** the UI surfaces a clear error message indicating that a tag with that name already exists

