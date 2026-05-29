## Context

This is the first feature in a greenfield repository. The team has chosen a monorepo containing a React frontend and a Quarkus backend, with Auth0 providing identity. The application must support multiple users, each seeing only their own todos and tags. Local development should be reproducible without provisioning cloud infrastructure beyond an Auth0 tenant.

Stakeholders: backend, frontend, and platform engineers using this repo as a baseline. Constraints: only one application stack is established (no prior services or specs), no production environment exists yet, and secrets must not be committed.

## Goals / Non-Goals

**Goals:**
- Establish a working end-to-end stack: React UI → Quarkus REST API → PostgreSQL, secured by Auth0 OIDC.
- Provide per-user CRUD for todos (with due date, priority, tags) and for tags.
- Keep local dev friction low: a single `docker compose up` (or Quarkus Dev Services) provisions Postgres; the frontend talks to the backend via a Vite dev proxy.
- Make security the default: every API endpoint except health/openapi requires a valid Auth0 JWT, and queries are always filtered by the authenticated user.

**Non-Goals:**
- Sharing todos or tags between users (single-owner model only).
- Real-time updates (WebSockets, SSE).
- Mobile apps, offline mode, push notifications, recurring todos, sub-tasks, attachments.
- Production deployment automation (CI/CD, IaC) — covered by a later change.
- Admin or multi-tenant management features.

## Decisions

### 1. Monorepo layout
- Top-level `frontend/` and `backend/` directories, each independently buildable.
- Root `docker-compose.yml` for Postgres; root `README.md` explains running both apps.
- **Alternatives considered**: separate repos (rejected — adds coordination overhead for a single team), Nx/Turborepo (rejected — premature tooling for two apps in different ecosystems).

### 2. Backend: Quarkus + Hibernate ORM with Panache + Flyway
- Quarkus REST (Jakarta REST) for HTTP, Hibernate ORM with Panache for persistence, Flyway for schema migrations, `quarkus-oidc` for JWT validation.
- **Alternatives considered**: Spring Boot (rejected — team chose Quarkus), JOOQ/jdbi (rejected — Panache is idiomatic for Quarkus and sufficient for CRUD).

### 3. Frontend: React 18 + Vite + TypeScript + TanStack Query + `@auth0/auth0-react`
- Vite for dev/build speed, TanStack Query for server state and caching, `@auth0/auth0-react` for the Authorization Code + PKCE flow in the browser.
- **Alternatives considered**: Next.js (rejected — SSR not needed and complicates Auth0 flow), Redux (rejected — TanStack Query covers server state; local UI state with React hooks is enough).

### 4. Authentication: Auth0 OIDC, backend validates JWT
- Frontend uses Auth0 Universal Login via `@auth0/auth0-react`; it obtains an access token for the configured API audience and attaches it as `Authorization: Bearer <jwt>` on every API call.
- Backend trusts Auth0 as the issuer; `quarkus-oidc` validates signature, issuer, audience, and expiry against the Auth0 JWKS endpoint.
- Per-user identity is the `sub` claim from the JWT. On first request from a new `sub`, the backend lazily creates a `users` row (id = generated UUID, `auth_subject` = `sub`, `email` from token if present).
- **Alternatives considered**: rolling our own auth (rejected — out of scope and risky), session cookies with a BFF (rejected — adds a stateful layer the SPA model doesn't need here).

### 5. Data model (PostgreSQL)
- `users(id uuid pk, auth_subject text unique not null, email text, created_at timestamptz)`
- `todos(id uuid pk, user_id uuid fk → users.id, title text not null, description text, due_date date null, priority text not null check in ('LOW','MEDIUM','HIGH'), completed boolean not null default false, created_at timestamptz, updated_at timestamptz)`
- `tags(id uuid pk, user_id uuid fk → users.id, name text not null, unique(user_id, name))`
- `todo_tags(todo_id uuid fk → todos.id on delete cascade, tag_id uuid fk → tags.id on delete cascade, primary key(todo_id, tag_id))`
- Indexes: `todos(user_id, completed)`, `todos(user_id, due_date)`, `tags(user_id)`.

### 6. API shape
- Base path `/api`. Resources: `/api/todos`, `/api/todos/{id}`, `/api/tags`, `/api/tags/{id}`.
- Filtering on `GET /api/todos`: `completed`, `priority`, `tag` (id), `dueBefore`, `dueAfter`, `sort` (`dueDate`|`priority`|`createdAt`, default `createdAt desc`).
- All resources require an authenticated user; any attempt to access another user's resource returns `404` (not `403`) to avoid leaking existence.
- DTOs are explicit (no entity exposure); JSON dates use ISO-8601.

### 7. Local dev experience
- `docker-compose.yml` runs Postgres 16 on `localhost:5432`.
- Backend `application.properties` reads DB and Auth0 config from environment variables with sensible local defaults.
- Frontend `.env.local` (gitignored; `.env.example` committed) holds `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_API_BASE_URL`.
- Vite dev server proxies `/api` to `http://localhost:8080` so the SPA and API share an origin in dev.

## Risks / Trade-offs

- **Auth0 tenant required for any meaningful dev/testing** → Mitigation: document tenant setup in `README.md`; provide a backend "dev" profile that can bypass auth for local-only manual testing (clearly gated and not enabled in tests of auth-sensitive paths).
- **Lazy user provisioning on first request introduces a race when two requests arrive concurrently for a brand-new `sub`** → Mitigation: rely on the `users.auth_subject` unique constraint and retry once on conflict.
- **Tag rename via PUT can collide with another tag of the same name for the same user** → Mitigation: enforce the `unique(user_id, name)` constraint and return `409 Conflict` with a clear error body.
- **`@auth0/auth0-react` stores tokens in memory by default; a page reload requires a silent re-auth and needs third-party cookies / refresh-token rotation** → Mitigation: enable refresh-token rotation in the Auth0 app config and use `cacheLocation: 'memory'` with `useRefreshTokens: true`.
- **Panache + Hibernate can N+1 on the todo→tags relation** → Mitigation: fetch tags via an explicit join fetch in the list query and add a test that asserts query count.

## Migration Plan

Not applicable — this is the first change. Initial schema is created by Flyway migration `V1__init.sql` on first backend boot. Rollback = drop the database (no production data exists).

## Open Questions

- Should tag colors be part of v1, or deferred? (Current decision: deferred; tags are just names.)
- Do we need a `GET /api/me` endpoint to return the current user profile, or is the JWT sufficient for the UI? (Current decision: add `GET /api/me` for convenience and to trigger lazy user provisioning.)

### 8. Deployment topology and API security boundaries

The target production topology is:

```
browser ──HTTPS──▶ Cloudflare ──Tunnel──▶ AKS (private)
                                            ├─ cloudflared Deployment (≥2 replicas)
                                            ├─ nginx-ingress (internal LB)
                                            └─ Quarkus pods
                                                  │
                                                  ▼
                                            Azure DB for PostgreSQL
                                            Flexible Server (private endpoint)
```

Security responsibilities are split across layers, with the application layer enforcing its own baseline so that misconfiguration upstream does not silently weaken the API:

- **Cloudflare**: TLS termination, HSTS at the edge, WAF, DDoS, edge rate limiting.
- **Cloudflare Tunnel**: structural origin lockdown — the AKS ingress has only a private IP, so the API cannot be reached without going through Cloudflare. No public load balancer, no Cloudflare IP allow-list to maintain.
- **nginx-ingress (internal)**: terminates the in-cluster hop from cloudflared, sets forwarded headers, may optionally reinforce headers or rate limits via annotations.
- **Quarkus application**: enforces CORS, security headers, JWT validation, per-user scoping, and trusts the configured forwarded headers so logged client IPs are real. The application does not assume any upstream layer is correctly configured.

The `api-security` capability captures the application-layer requirements (CORS, headers, forwarded headers, safe health endpoints). The cluster, tunnel, ingress, Postgres provisioning, secrets, NetworkPolicy, and pod security context will be covered by a separate `deploy-to-aks` change once this one is implemented.

**Alternatives considered**:
- *Public AKS ingress restricted to Cloudflare IP ranges* — rejected: requires maintaining the CF IP allow-list and still exposes a public surface.
- *Headers and CORS only at nginx-ingress via annotations* — rejected: annotations get lost on migration or namespace moves and are not testable from the app's integration tests.
- *TLS terminated at Quarkus* — rejected: Cloudflare and the ingress handle TLS; in-app TLS adds cert-management burden inside the pod.
