## Why

We need a multi-user todo list application to allow authenticated users to organize tasks with due dates, priorities, and tags. This establishes the project's first end-to-end feature stack — a React frontend, Quarkus backend, and Auth0-based identity — that future features will build on.

## What Changes

- Introduce a monorepo with two apps: `frontend/` (React + TypeScript + Vite) and `backend/` (Quarkus + Java).
- Add Auth0-based OAuth 2.0 / OIDC authentication; backend validates JWTs issued by Auth0 and scopes all data to the authenticated user.
- Implement Todo CRUD: create, list, view, update, complete, delete todos owned by the current user.
- Support per-todo metadata: `dueDate`, `priority` (LOW/MEDIUM/HIGH), and a many-to-many `tags` relationship.
- Implement Tag management scoped per user: create, list, rename, delete.
- Expose a REST API under `/api` with filtering (by tag, priority, completion, due-date range) and sorting.
- Persist data in PostgreSQL via Hibernate ORM with Panache; provide a Dev Services / Docker Compose setup for local development.
- Add a React UI for login, todo list view with filters, create/edit forms, and tag management.
- Enforce baseline API security at the application layer (CORS allow-list, security headers, forwarded-header handling, safe health endpoints) as defense in depth alongside Cloudflare and the ingress.

## Capabilities

### New Capabilities
- `authentication`: Auth0-based OIDC login on the frontend and JWT validation on the backend, exposing a stable per-user identity used by all other capabilities.
- `todo-management`: User-scoped CRUD for todos including title, description, due date, priority, completion state, and tag associations, plus filtering and sorting.
- `tag-management`: User-scoped CRUD for tags and their association with todos.
- `api-security`: Application-layer baseline security for the REST API — CORS allow-list, security headers on every response, trust of forwarded headers from the configured proxy chain, and safe-by-default health endpoints.
- `test-coverage`: Project-wide minimum of 80% line and 80% branch coverage on both backend and frontend, enforced by the build (JaCoCo and Vitest).

### Modified Capabilities
<!-- None: this is the first change. -->

## Impact

- New top-level directories: `frontend/`, `backend/`, plus `docker-compose.yml` for local Postgres.
- New runtime dependencies: Quarkus (RESTEasy Reactive, Hibernate ORM Panache, OIDC, Postgres, Flyway), React 18, Vite, TypeScript, `@auth0/auth0-react`, TanStack Query.
- New external dependency: an Auth0 tenant (configured via environment variables, no secrets committed).
- New CI surface: build/test for both apps; no existing systems are affected since this is the first feature.
