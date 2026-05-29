## 1. Monorepo & Local Infrastructure

- [x] 1.1 Create top-level `frontend/` and `backend/` directories with their own README stubs
- [x] 1.2 Add root `README.md` describing the monorepo layout and how to run both apps
- [x] 1.3 Add root `docker-compose.yml` running PostgreSQL 16 on `localhost:5432` with a named volume
- [x] 1.4 Add root `.gitignore` covering Node, Java, Quarkus, IDE, and `.env.local` files

## 2. Backend Bootstrap (Quarkus)

- [x] 2.1 Generate a Quarkus project in `backend/` with extensions: `quarkus-rest-jackson`, `quarkus-hibernate-orm-panache`, `quarkus-jdbc-postgresql`, `quarkus-flyway`, `quarkus-oidc`, `quarkus-smallrye-openapi`, `quarkus-hibernate-validator`
- [x] 2.2 Configure `application.properties` with env-driven datasource, Flyway enabled, and OIDC settings reading `AUTH0_DOMAIN` / `AUTH0_AUDIENCE`
- [x] 2.3 Add a `dev` profile with sensible defaults pointing to the docker-compose Postgres
- [x] 2.4 Add `GET /api/health` (unauthenticated) returning `{ "status": "UP" }`

## 3. Database Schema (Flyway V1)

- [x] 3.1 Create `db/migration/V1__init.sql` with `users`, `todos`, `tags`, `todo_tags` tables matching the design's data model
- [x] 3.2 Add indexes on `todos(user_id, completed)`, `todos(user_id, due_date)`, `tags(user_id)`
- [x] 3.3 Add the `unique(user_id, name)` constraint on `tags`
- [x] 3.4 Verify migration runs cleanly against a fresh Postgres via `mvn quarkus:dev`

## 4. Domain Entities & Repositories

- [x] 4.1 Create `User`, `Todo`, `Tag` Panache entities with the relations described in design
- [x] 4.2 Add a `Priority` enum (`LOW`, `MEDIUM`, `HIGH`) persisted as text
- [x] 4.3 Implement `UserRepository`, `TodoRepository`, `TagRepository` with helper finders scoped by `user_id`
- [x] 4.4 Add a unit-style test for each repository's user-scoping behavior using `@QuarkusTest` and a test profile

## 5. Authentication & Current-User Resolution

- [x] 5.1 Configure `quarkus-oidc` so all `/api/**` endpoints require auth except `/api/health` and `/q/openapi*`
- [x] 5.2 Implement a `CurrentUser` request-scoped CDI bean that resolves the JWT `sub`, lazily creates the `users` row, and exposes the `User` id
- [x] 5.3 Handle the concurrent first-request race with a retry on `users.auth_subject` unique-constraint violation
- [x] 5.4 Implement `GET /api/me` returning `{ id, authSubject, email }`
- [x] 5.5 Add tests covering 401 on missing/invalid token, 200 on valid token, and lazy user creation

## 6. Tag REST API

- [x] 6.1 Define `TagDto` and request bodies for create / rename
- [x] 6.2 Implement `POST /api/tags` with validation, per-user uniqueness, mapping conflict to HTTP 409
- [x] 6.3 Implement `GET /api/tags` returning the current user's tags sorted by name
- [x] 6.4 Implement `PUT /api/tags/{id}` (owner-only, 404 otherwise, 409 on duplicate name)
- [x] 6.5 Implement `DELETE /api/tags/{id}` (204, cascades `todo_tags`, leaves todos)
- [x] 6.6 Add integration tests covering every scenario in `specs/tag-management/spec.md`

## 7. Todo REST API

- [x] 7.1 Define `TodoDto`, `CreateTodoRequest`, `UpdateTodoRequest`, `CompletionRequest`
- [x] 7.2 Implement `POST /api/todos` with validation, tag ownership check, default priority `MEDIUM`
- [x] 7.3 Implement `GET /api/todos` supporting `completed`, `priority`, `tag`, `dueBefore`, `dueAfter`, `sort` query params (default sort `createdAt desc`, `dueDate` puts nulls last)
- [x] 7.4 Implement `GET /api/todos/{id}` (owner-only, 404 otherwise)
- [x] 7.5 Implement `PUT /api/todos/{id}` (full update, refreshes `updatedAt`)
- [x] 7.6 Implement `PATCH /api/todos/{id}/completion`
- [x] 7.7 Implement `DELETE /api/todos/{id}` (204, cascades `todo_tags`, keeps tags)
- [x] 7.8 Add a fetch-join query and a test asserting no N+1 when listing todos with tags
- [x] 7.9 Add integration tests covering every scenario in `specs/todo-management/spec.md`

## 8. Frontend Bootstrap (React + Vite)

- [x] 8.1 Scaffold a Vite + React + TypeScript project in `frontend/`
- [x] 8.2 Add dependencies: `@auth0/auth0-react`, `@tanstack/react-query`, `react-router-dom`, `axios` (or `fetch` wrapper)
- [x] 8.3 Configure Vite dev proxy: `/api` → `http://localhost:8080`
- [x] 8.4 Add `.env.example` with `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_API_BASE_URL`; gitignore `.env.local`
- [x] 8.5 Set up ESLint + Prettier defaults from the Vite template

## 9. Frontend Authentication

- [x] 9.1 Wrap the app in `Auth0Provider` with `cacheLocation: 'memory'` and `useRefreshTokens: true`
- [x] 9.2 Create a `RequireAuth` route guard that triggers `loginWithRedirect` for unauthenticated users
- [x] 9.3 Build a public landing page and a header with Login / Logout controls
- [x] 9.4 Implement an `apiClient` that calls `getAccessTokenSilently({ authorizationParams: { audience } })` and sets `Authorization: Bearer <jwt>` on every request
- [x] 9.5 Add a `useCurrentUser` hook backed by `GET /api/me`

## 10. Frontend Tag Management UI

- [x] 10.1 Add a tags page listing the user's tags with create / rename / delete controls
- [x] 10.2 Wire TanStack Query mutations for create / rename / delete with cache invalidation
- [x] 10.3 Surface HTTP 409 from rename as an inline "name already exists" error

## 11. Frontend Todo UI

- [x] 11.1 Build the todos page: list view showing title, due date, priority, completion checkbox, tag chips
- [x] 11.2 Add filter controls for completion, priority, and tag, syncing to URL query string
- [x] 11.3 Build a create-todo form (title, description, due date, priority, tag multi-select)
- [x] 11.4 Build an edit-todo form reusing the create form
- [x] 11.5 Implement optimistic completion toggling via `PATCH /api/todos/{id}/completion` with rollback on error
- [x] 11.6 Implement delete with confirmation

## 12. API Security (cross-cutting backend)

- [x] 12.1 Configure CORS in `application.properties` from env vars: `APP_CORS_ORIGINS` (comma-separated, no `*`), `APP_CORS_METHODS`, `APP_CORS_HEADERS` (incl. `Authorization`, `Content-Type`), `APP_CORS_MAX_AGE`
- [x] 12.2 Add a startup check that fails fast if any allowed origin equals `*`
- [x] 12.3 Implement a `ContainerResponseFilter` (or equivalent) that sets on every `/api/**` response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [x] 12.4 Add `Cache-Control: no-store` on responses to authenticated routes
- [x] 12.5 Configure `quarkus.http.proxy.proxy-address-forwarding=true`, `quarkus.http.proxy.allow-forwarded=true`, and trust `X-Forwarded-*` plus `CF-Connecting-IP`; restrict trust to the configured proxy CIDR(s) via env (`APP_TRUSTED_PROXIES`)
- [x] 12.6 Add the `quarkus-smallrye-health` extension; expose `/q/health/live` and `/q/health/ready` unauthenticated; ensure responses do not leak version, hostnames, driver info, or stack traces
- [x] 12.7 Integration tests for `specs/api-security/spec.md`:
  - allowed origin gets `Access-Control-Allow-Origin` echoed and `Vary: Origin`
  - preflight `OPTIONS` returns 204 with expected headers
  - disallowed origin gets no `Access-Control-Allow-*` headers
  - startup fails with `*` in the origin list
  - all listed security headers present on 2xx and on 4xx/5xx responses
  - `Cache-Control: no-store` on authenticated responses
  - spoofed `X-Forwarded-For` / `CF-Connecting-IP` from an untrusted source are ignored
  - `/q/health/live` and `/q/health/ready` return only `{ "status": ... }`

## 13. Test Coverage (cross-cutting)

- [x] 13.1 Add JaCoCo `prepare-agent`, `report`, and `check` executions to `backend/pom.xml` with BUNDLE-level `LINE` and `BRANCH` minimums of 0.80, bound to `verify`
- [x] 13.2 Verify the gate fires: confirm `./mvnw verify` fails when coverage drops, and passes when the tests cover the configured threshold
- [x] 13.3 Configure Vitest `coverage` in `frontend/vite.config.ts` (or `vitest.config.ts`) with `lines: 80, branches: 80` thresholds
- [x] 13.4 Add `test:coverage` script to `frontend/package.json` that runs Vitest with the `--coverage` flag and fails on threshold violations
- [x] 13.5 Document the policy in `backend/README.md` and `frontend/README.md` (how to run, where to find the HTML report, what the exclusions are and why)
- [x] 13.6 Reference the `test-coverage` spec from the root `README.md` so contributors discover the gate before opening a PR

## 14. Documentation & Wrap-up

- [x] 14.1 Document local dev workflow in `backend/README.md` (Postgres via docker-compose, OIDC env vars, how to run tests)
- [x] 14.2 Document local dev workflow in `frontend/README.md` (Auth0 env vars, Vite proxy, scripts)
- [x] 14.3 Update root `README.md` with the AKS / Cloudflare topology summary and a link to `openspec/changes/add-todo-app/design.md`
- [x] 14.4 Run `openspec validate add-todo-app --strict` and confirm it passes
