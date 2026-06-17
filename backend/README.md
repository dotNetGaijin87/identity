# IdP Backend (Go, modular monolith)

A Go API that replaces the frontend's MSW mock backend. It serves the admin/management
API the console uses today (tenants, users, clients, roles + admin auth) and will grow a
real OIDC provider. One binary, internally split into domain **modules** that talk only
through interfaces wired at a single composition root.

## Stack

| Concern | Choice |
|---|---|
| Language | Go 1.26 |
| Router | chi v5 |
| DB | Postgres 16 |
| Queries | sqlc (type-safe SQL) + pgx |
| Migrations | goose |
| Admin (console) auth | **httpOnly session cookie (BFF)** — no tokens in the browser |
| OIDC provider (tokens issued to client apps) | `zitadel/oidc` (Milestone 5) |
| Passwords | bcrypt |
| Contract | OpenAPI → `oapi-codegen` (keeps front/back in sync) |

## Structure

```
backend/
├── cmd/api/main.go                 # entrypoint: config → app → listen, graceful shutdown
├── internal/
│   ├── platform/                   # shared infra, no business logic
│   │   ├── config/                 # env → typed config
│   │   ├── httpx/                  # JSON + {message} error envelope, body decode
│   │   ├── middleware/             # CORS, request logging (+ auth, later)
│   │   └── database/               # pgx pool + sqlc-generated store (later)
│   ├── modules/                    # auth, tenants, users, roles, clients, oidc (added per milestone)
│   └── app/app.go                  # composition root: build modules, mount /api routes
├── migrations/                     # goose SQL migrations (0001_init.sql = full schema)
├── sqlc.yaml · docker-compose.yml · Makefile · .env.example
```

**Module rule:** `handler → service → repository`; a module depends on another only via an
interface injected in `app.go` (e.g. users validating role IDs against the roles service).
No module-to-module concrete imports, no cycles — the backend mirror of the frontend's
"feature public API" rule.

## Running locally

```bash
cp .env.example .env
make tools          # one-time: installs goose + sqlc
make db-up          # start Postgres (needs Docker Desktop running)
make migrate        # apply migrations
make run            # serve on :8080  →  GET /healthz
```

The frontend talks to this via a Vite dev proxy (`/api → :8080`); MSW stays for the test
suite only.

## Status

- **Milestone 0 (done):** scaffold, config, `{message}` errors, middleware, schema migration,
  sqlc/compose/Makefile. `go build` + `go vet` green; `/healthz` serves.
- **Milestone 1 (done):** `auth` module — login/logout/me via bcrypt + opaque httpOnly session
  cookie (BFF). Seeds `admin/admin`. Exported `Authenticate` middleware guards every other module.
- **Milestone 2 (done):** `tenants` module (clean architecture: domain → service → repository
  port → sqlc adapter). Auth refactored to the same ports/adapters shape.
- **Milestone 3 (done):** `roles` + `users` modules. Users depends on a `RoleChecker` **port**
  (the roles service, injected at the composition root) to validate role assignments; assignment
  replacement runs in a transaction.
- **Milestone 4 (done):** `clients` module — all settings (`text[]` for URIs/scopes, capability
  flags, PKCE, token lifespan), secret generation + `regenerate-secret`.

**The frontend now runs entirely on this backend** (Vite proxy `/api → :8080`, `VITE_API_MOCKING=disabled`).
MSW remains only for the Vitest suite. Demo data (tenants/roles/users/clients) is seeded on first boot.

- **Milestone 5 (done):** OIDC provider (`zitadel/oidc`), **per-tenant issuer** (`/oidc/{tenant}`,
  one issuer per tenant). Discovery + JWKS, `/authorize` → hosted login (end-user bcrypt creds from
  Postgres) → auth-code with **PKCE**, `/token` (authorization_code + refresh_token grants) issuing
  a signed id_token + access token + refresh token, and `/userinfo`. Verified end-to-end (id_token
  signature checked against JWKS).

  Notes: signing keys, auth requests, and issued tokens are in-memory (single-instance dev);
  client_credentials grant and key persistence are follow-ups.

- **Milestone 6 (done):** hardening — per-IP **login rate-limiting** (429), **service unit tests**
  for every module (fast, DB-free thanks to the repository ports), **backend CI**
  (`gofmt`/`vet`/`build`/`test` against a Postgres service), and an **`openapi.yaml`** contract for
  the management API (`make openapi-ts` generates frontend TS types via `openapi-typescript`).

  Deferred: a Playwright e2e against the full real stack (Postgres + Go + SPA) — the frontend's
  existing e2e runs against the MSW-backed dev app.
