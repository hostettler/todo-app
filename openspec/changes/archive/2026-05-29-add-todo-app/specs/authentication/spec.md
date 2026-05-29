## ADDED Requirements

### Requirement: Auth0 OIDC login on the frontend
The frontend SHALL authenticate users via Auth0 using the OIDC Authorization Code flow with PKCE, and SHALL obtain an access token for the configured API audience before calling any protected backend endpoint.

#### Scenario: Unauthenticated user visits a protected page
- **WHEN** an unauthenticated user navigates to any route other than the public landing page
- **THEN** the frontend redirects the user to the Auth0 Universal Login page

#### Scenario: Successful login returns to the application
- **WHEN** the user completes login at Auth0
- **THEN** the frontend receives an access token for the configured audience
- **AND** restores the originally requested route

#### Scenario: User logs out
- **WHEN** the user triggers logout
- **THEN** the frontend clears its in-memory tokens
- **AND** redirects to the Auth0 logout endpoint, which returns the user to the public landing page

### Requirement: Backend validates Auth0-issued JWTs
The backend SHALL require a valid Auth0-issued JWT (signature, issuer, audience, and expiry verified against the Auth0 JWKS endpoint) on every endpoint under `/api/**` except `/api/health` and the OpenAPI/Swagger endpoints.

#### Scenario: Request without a token
- **WHEN** a client calls a protected endpoint with no `Authorization` header
- **THEN** the backend responds with HTTP 401

#### Scenario: Request with an invalid or expired token
- **WHEN** a client calls a protected endpoint with a token that fails signature, issuer, audience, or expiry validation
- **THEN** the backend responds with HTTP 401

#### Scenario: Request with a valid token
- **WHEN** a client calls a protected endpoint with a valid Auth0 access token whose audience matches the configured API audience
- **THEN** the backend processes the request as the user identified by the `sub` claim

### Requirement: Lazy provisioning of the application user
The backend SHALL maintain its own `users` record keyed by the Auth0 `sub` claim, and SHALL create that record on the first authenticated request from a previously unseen `sub`.

#### Scenario: First request from a new subject
- **WHEN** an authenticated request arrives with a `sub` value that has no matching `users` row
- **THEN** the backend creates a `users` row with that `auth_subject`, copying `email` from the token when present
- **AND** uses the new row's id as the owner for any data created during the request

#### Scenario: Subsequent requests reuse the existing user
- **WHEN** an authenticated request arrives with a `sub` value that already has a `users` row
- **THEN** the backend reuses that row without creating a duplicate

### Requirement: Current-user endpoint
The backend SHALL expose `GET /api/me` that returns the authenticated user's id, `auth_subject`, and `email`.

#### Scenario: Authenticated user fetches their profile
- **WHEN** an authenticated client calls `GET /api/me`
- **THEN** the backend returns HTTP 200 with `{ id, authSubject, email }` for the current user
