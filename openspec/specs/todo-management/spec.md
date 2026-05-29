# todo-management Specification

## Purpose
TBD - created by archiving change add-todo-app. Update Purpose after archive.
## Requirements
### Requirement: Create a todo
The backend SHALL allow an authenticated user to create a todo owned by that user, with a required `title`, optional `description`, optional `dueDate` (ISO-8601 date), required `priority` (`LOW`, `MEDIUM`, or `HIGH`; default `MEDIUM` if omitted), and an optional set of `tagIds` referencing tags owned by the same user.

#### Scenario: Valid create request
- **WHEN** an authenticated user `POST`s to `/api/todos` with a JSON body containing at least a non-empty `title`
- **THEN** the backend responds with HTTP 201 and a JSON body containing the new todo's `id`, `title`, `description`, `dueDate`, `priority`, `completed: false`, `tags`, `createdAt`, and `updatedAt`
- **AND** the todo is owned by the authenticated user

#### Scenario: Missing title
- **WHEN** an authenticated user `POST`s to `/api/todos` with an empty or missing `title`
- **THEN** the backend responds with HTTP 400 and an error body describing the validation failure

#### Scenario: tagIds reference tags not owned by the user
- **WHEN** the request includes any `tagId` that does not belong to the authenticated user
- **THEN** the backend responds with HTTP 400 and does not create the todo

### Requirement: List todos with filtering and sorting
The backend SHALL return only the authenticated user's todos from `GET /api/todos`, and SHALL support the query parameters `completed` (boolean), `priority` (`LOW`|`MEDIUM`|`HIGH`), `tag` (tag id), `dueBefore` (date), `dueAfter` (date), and `sort` (`dueDate`, `priority`, or `createdAt`; default `createdAt` descending).

#### Scenario: Default listing
- **WHEN** an authenticated user calls `GET /api/todos` with no query parameters
- **THEN** the backend returns HTTP 200 with all todos owned by that user, sorted by `createdAt` descending
- **AND** does not return any todo owned by another user

#### Scenario: Filter by completion and priority
- **WHEN** an authenticated user calls `GET /api/todos?completed=false&priority=HIGH`
- **THEN** the backend returns only that user's incomplete todos with priority `HIGH`

#### Scenario: Filter by tag and due-date range
- **WHEN** an authenticated user calls `GET /api/todos?tag={tagId}&dueAfter=2026-01-01&dueBefore=2026-12-31`
- **THEN** the backend returns only that user's todos that are associated with the given tag and whose `dueDate` falls within the inclusive range

#### Scenario: Sort override
- **WHEN** an authenticated user calls `GET /api/todos?sort=dueDate`
- **THEN** the backend returns the user's todos sorted by `dueDate` ascending, with todos lacking a `dueDate` ordered last

### Requirement: Retrieve a single todo
The backend SHALL allow an authenticated user to fetch one of their todos by id via `GET /api/todos/{id}`.

#### Scenario: Owner fetches their todo
- **WHEN** an authenticated user calls `GET /api/todos/{id}` for a todo they own
- **THEN** the backend returns HTTP 200 with the full todo representation, including its tags

#### Scenario: Todo does not exist or belongs to another user
- **WHEN** an authenticated user calls `GET /api/todos/{id}` for an id that does not exist or that belongs to another user
- **THEN** the backend returns HTTP 404

### Requirement: Update a todo
The backend SHALL allow an authenticated user to update one of their todos via `PUT /api/todos/{id}`, replacing `title`, `description`, `dueDate`, `priority`, and `tagIds` with the provided values, and SHALL refresh `updatedAt`.

#### Scenario: Owner updates their todo
- **WHEN** an authenticated user `PUT`s a valid body to `/api/todos/{id}` for a todo they own
- **THEN** the backend returns HTTP 200 with the updated todo
- **AND** `updatedAt` is later than its previous value

#### Scenario: Update targets another user's todo
- **WHEN** an authenticated user `PUT`s to `/api/todos/{id}` for a todo owned by another user
- **THEN** the backend returns HTTP 404 and does not modify any data

### Requirement: Toggle completion
The backend SHALL allow an authenticated user to mark one of their todos complete or incomplete via `PATCH /api/todos/{id}/completion` with a body `{ "completed": <boolean> }`.

#### Scenario: Mark as complete
- **WHEN** an authenticated user `PATCH`es `{ "completed": true }` to their todo's completion endpoint
- **THEN** the backend returns HTTP 200 with `completed: true`

#### Scenario: Re-open a completed todo
- **WHEN** an authenticated user `PATCH`es `{ "completed": false }` to their previously completed todo
- **THEN** the backend returns HTTP 200 with `completed: false`

### Requirement: Delete a todo
The backend SHALL allow an authenticated user to delete one of their todos via `DELETE /api/todos/{id}`.

#### Scenario: Owner deletes their todo
- **WHEN** an authenticated user `DELETE`s `/api/todos/{id}` for a todo they own
- **THEN** the backend returns HTTP 204
- **AND** the todo and its `todo_tags` associations are removed
- **AND** the referenced tags themselves are not deleted

#### Scenario: Delete targets another user's todo
- **WHEN** an authenticated user `DELETE`s `/api/todos/{id}` for a todo owned by another user
- **THEN** the backend returns HTTP 404 and does not modify any data

### Requirement: Frontend todo experience
The frontend SHALL provide authenticated users a UI to list, filter, create, edit, complete, and delete their todos, surfacing `title`, `dueDate`, `priority`, completion state, and tags.

#### Scenario: Viewing todos
- **WHEN** an authenticated user opens the todos page
- **THEN** the UI displays the user's todos with title, due date, priority, completion state, and tag chips
- **AND** provides controls to filter by completion, priority, and tag

#### Scenario: Creating a todo from the UI
- **WHEN** the user submits the "new todo" form with a title and optional fields
- **THEN** the UI calls the backend and shows the new todo in the list without a full page reload

#### Scenario: Completing a todo from the UI
- **WHEN** the user toggles the completion control on a todo row
- **THEN** the UI optimistically updates the row and persists the change via the backend, reverting on error

