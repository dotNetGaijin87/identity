# IdP Backend (Go, modular monolith)

A Go API that replaces the frontend's MSW mock backend. It serves the admin/management
API the console uses today (tenants, users, clients, roles + admin auth) and will grow a
real OIDC provider. One binary, internally split into domain **modules** that talk only
through interfaces wired at a single composition root.

## Stack

| Concern                                      | Choice                                                       |
| -------------------------------------------- | ------------------------------------------------------------ |
| Language                                     | Go 1.26                                                      |
| Router                                       | chi v5                                                       |
| DB                                           | Postgres 16                                                  |
| Queries                                      | sqlc (type-safe SQL) + pgx                                   |
| Migrations                                   | goose                                                        |
| Admin (console) auth                         | **httpOnly session cookie (BFF)** — no tokens in the browser |
| OIDC provider (tokens issued to client apps) | `zitadel/oidc` (Milestone 5)                                 |
| Passwords                                    | bcrypt                                                       |
| Contract                                     | OpenAPI → `oapi-codegen` (keeps front/back in sync)          |

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

The frontend talks to this via a Vite dev proxy (`/api → :8080`); MSW stays for the test suite only.
