## ADDED Requirements

### Requirement: CORS policy
The backend SHALL respond to cross-origin requests under `/api/**` only when the request `Origin` matches an entry in a configured allow-list, and SHALL never use the wildcard `*` as an allowed origin. Allowed origins, methods, headers, and the preflight cache duration SHALL be configurable via environment variables.

#### Scenario: Allowed origin sends a simple request
- **WHEN** a browser at an allowed origin sends a request to `/api/**`
- **THEN** the backend includes `Access-Control-Allow-Origin` set to that exact origin in the response
- **AND** includes `Vary: Origin`

#### Scenario: Allowed origin sends a preflight request
- **WHEN** a browser at an allowed origin sends an `OPTIONS` preflight to `/api/**` with `Access-Control-Request-Method` and `Access-Control-Request-Headers`
- **THEN** the backend responds with HTTP 204 and headers `Access-Control-Allow-Origin` (echoing the origin), `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers` including `Authorization` and `Content-Type`, and `Access-Control-Max-Age`

#### Scenario: Disallowed origin
- **WHEN** a browser at an origin not in the allow-list sends a request to `/api/**`
- **THEN** the backend omits all `Access-Control-Allow-*` headers in the response, causing the browser to block the response

#### Scenario: Wildcard origin is rejected at startup
- **WHEN** the backend is configured with `*` as an allowed origin
- **THEN** the backend fails to start and logs a configuration error

### Requirement: Security headers on API responses
The backend SHALL include a fixed set of security headers on every response from `/api/**`, regardless of status code, to provide defense in depth alongside Cloudflare and the ingress.

#### Scenario: Headers on a successful response
- **WHEN** any client receives a response from `/api/**`
- **THEN** the response includes:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`

#### Scenario: Headers on an error response
- **WHEN** a client receives a 4xx or 5xx response from `/api/**`
- **THEN** the response still includes the same security headers

#### Scenario: Cache-Control on authenticated responses
- **WHEN** an authenticated request to `/api/**` returns a response
- **THEN** the response includes `Cache-Control: no-store`

### Requirement: Trust forwarded headers from the configured proxy
The backend SHALL be configured to recognize forwarded headers (`X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`) and the Cloudflare-specific `CF-Connecting-IP` header so that logged client IPs, generated absolute URLs, and the perceived scheme reflect the original client request rather than the in-cluster proxy hop.

#### Scenario: Request arrives via Cloudflare Tunnel and nginx-ingress
- **WHEN** a request reaches the backend with `CF-Connecting-IP: 203.0.113.5` and `X-Forwarded-Proto: https`
- **THEN** the backend logs `203.0.113.5` as the client IP
- **AND** treats the request as if received over HTTPS for the purpose of generating absolute URLs

#### Scenario: Forwarded headers from an untrusted source
- **WHEN** a request arrives directly (not via the configured proxy) with spoofed `X-Forwarded-For` or `CF-Connecting-IP` headers
- **THEN** the backend ignores those headers and uses the actual remote address

### Requirement: Health endpoints are unauthenticated and safe to expose internally
The backend SHALL expose `/q/health/live` and `/q/health/ready` (in addition to `/api/health`) without authentication, returning only `{ "status": "UP" | "DOWN" }` and no version, dependency, or environment information.

#### Scenario: Liveness probe
- **WHEN** the kubelet calls `/q/health/live`
- **THEN** the backend responds with HTTP 200 and `{ "status": "UP" }` while the process is running

#### Scenario: Readiness probe with database available
- **WHEN** the kubelet calls `/q/health/ready` and the database connection pool is healthy
- **THEN** the backend responds with HTTP 200 and `{ "status": "UP" }`

#### Scenario: Readiness probe with database unavailable
- **WHEN** the database is unreachable
- **THEN** `/q/health/ready` responds with HTTP 503 and `{ "status": "DOWN" }`
- **AND** the response body does not include database hostnames, driver versions, or stack traces
