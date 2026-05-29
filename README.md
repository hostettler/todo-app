# Scalability Test — Todo Application

A multi-user todo list application used as a baseline scalability/perf
test vehicle. It establishes a full end-to-end stack: React frontend,
Quarkus backend, PostgreSQL, and Auth0-based identity.

## Monorepo layout

```
.
├── frontend/        React + TypeScript + Vite SPA
├── backend/         Quarkus + Java REST API
├── docker-compose.yml   Local PostgreSQL 16
└── openspec/        Specifications and in-flight change proposals
```

## Prerequisites

- JDK 21+
- Maven 3.9+
- Node 20+ / npm 10+
- Docker (for the local PostgreSQL)
- An Auth0 tenant — see [Auth0 setup](#auth0-setup)

## Auth0 setup

1. Create a free Auth0 tenant at <https://auth0.com>.
2. Create a **Single Page Application** for the frontend. Note the
   *Domain* and *Client ID*.
3. Create an **API** representing the backend. Note the *Identifier* —
   this becomes the JWT `audience`.
4. In the SPA settings, allow the dev callback URLs:
   `http://localhost:5173`, `http://localhost:5173/callback`.
5. In the API settings, enable **RBAC** if you later add roles
   (not required for v1).

## Run the stack locally

```bash
# 1. Start PostgreSQL
docker compose up -d postgres

# 2. Start the backend (in another terminal)
cd backend
export AUTH0_DOMAIN=your-tenant.auth0.com
export AUTH0_AUDIENCE=https://api.example.com
./mvnw quarkus:dev

# 3. Start the frontend (in another terminal)
cd frontend
cp .env.example .env.local      # fill in Auth0 + API base URL
npm install
npm run dev
```

The frontend runs at <http://localhost:5173> and proxies `/api/*` to the
backend at <http://localhost:8080>.

## Specifications

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for
spec-driven development. Active specs live in `openspec/specs/`; in-flight
change proposals live in `openspec/changes/`. See `AGENTS.md` for the
contribution workflow.

The initial design (services, auth flow, deployment topology, threat
model) is captured in
[`openspec/changes/add-todo-app/design.md`](openspec/changes/add-todo-app/design.md).

## Deployment topology

Production target is **Azure Kubernetes Service (private cluster, no
public IP)** fronted by:

- **Cloudflare Tunnel** for public TLS termination and ingress to the
  private cluster (no public load balancer needed; Cloudflare handles
  HTTPS so the cluster itself runs HTTP internally).
- **nginx-ingress** inside the cluster, configured to trust only
  Cloudflare's forwarded headers and route `/api/*` to the backend
  service and `/` to the frontend.

The backend hardens HTTP responses with `quarkus.http.proxy.*` settings,
a CORS allow-list (no wildcards — enforced at startup), and a fixed set
of security headers (`X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Content-Security-Policy`,
`Strict-Transport-Security`, `Cache-Control: no-store` on authenticated
responses).

## Test coverage policy

Both `backend/` and `frontend/` enforce **≥ 80 % line and branch
coverage at bundle level** as a hard gate before any PR is merged.
See:

- [`openspec/specs/test-coverage/spec.md`](openspec/specs/test-coverage/spec.md)
- `backend/README.md` → "Test coverage policy"
- `frontend/README.md` → "Test coverage policy"

Run the gates locally:

```bash
( cd backend  && ./mvnw verify )
( cd frontend && npm run test:coverage )
```
# todo-app
# todo-app
