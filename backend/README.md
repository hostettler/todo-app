# Backend

Quarkus + Java REST API for the Todo application.

See the root `README.md` for monorepo layout. Profiles, environment
variables, and test commands are documented here.

## Quick start (after scaffolding)

```bash
cd backend
./mvnw quarkus:dev
```

Requires the docker-compose Postgres from the repo root (`docker compose up -d postgres`)
and the Auth0 environment variables described below.

## Environment variables

| Variable                | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `DB_URL`                | JDBC URL for PostgreSQL                            |
| `DB_USERNAME`           | DB user                                            |
| `DB_PASSWORD`           | DB password                                        |
| `AUTH0_DOMAIN`          | Auth0 tenant domain (e.g. `example.auth0.com`)     |
| `AUTH0_AUDIENCE`        | API audience identifier configured in Auth0        |
| `APP_CORS_ORIGINS`      | Comma-separated allow-list (no `*`)                |
| `APP_CORS_METHODS`      | Allowed HTTP methods                               |
| `APP_CORS_HEADERS`      | Allowed request headers                            |
| `APP_CORS_MAX_AGE`      | Preflight cache duration in seconds                |
| `APP_TRUSTED_PROXIES`   | Comma-separated CIDRs whose forwarded headers are trusted |

## Tests

```bash
./mvnw test                # unit + Quarkus integration tests
./mvnw verify              # also runs the JaCoCo coverage gate
```

## Test coverage policy

Coverage is enforced by JaCoCo via Maven `verify`. The gate is **80 % line
and 80 % branch coverage at bundle level** (`backend/pom.xml`). The build
fails if coverage drops below either threshold.

How it works:

- The standard JaCoCo agent (configured by `prepare-agent`) writes
  `target/jacoco.exec` for plain JUnit tests.
- The `quarkus-jacoco` extension writes `target/jacoco-quarkus.exec` for
  `@QuarkusTest` runs (which use a separate ClassLoader).
- A Maven `merge` execution combines both into `target/jacoco-merged.exec`,
  which the `report` and `check` executions consume.
- HTML report: `target/site/jacoco/index.html` (open in a browser).

Exclusions (and why):

- `**/auth/CurrentUser*` — thin per-request facade around
  `UserProvisioning`; the latter is unit-tested directly.

Run the gate locally before opening a PR:

```bash
./mvnw verify
```

See `openspec/specs/test-coverage/spec.md` for the cross-cutting policy.
