# IdP — Identity Provider Platform

A multi-tenant identity provider with a web admin console. Monorepo:

```
idp/
├── backend/         Go API (modular monolith) + OIDC provider, on Postgres
└── admin-console/   React + TypeScript admin SPA
```

## What it is

- **Admin console** (`admin-console/`) — a React app to manage **tenants**, and within each tenant
  its **users**, **clients**, and **roles** (list / create / edit), including assigning roles to a
  user. Dark theme; signs in with an httpOnly session cookie.
- **Backend** (`backend/`) — a Go modular monolith (clean-architecture layers: domain → service →
  repository port → sqlc adapter; cross-module deps wired as interfaces at one composition root):
  - **Management API** for the console (auth, tenants, users, roles, clients) on Postgres.
  - **OIDC provider** (built on `zitadel/oidc`) with a **per-tenant issuer** (`/oidc/{tenant}`):
    discovery + JWKS, `/authorize` → hosted login (PKCE), `/token` (code + refresh), `/userinfo`.

Two distinct auth contexts: the **console** logs admins in via a session cookie (BFF); the **OIDC
provider** issues tokens to *client apps* for *their* end-users.

## Run it locally

Prereqs: **Docker Desktop**, **Go 1.26+**, **Node 20+**.

**Terminal 1 — backend (from `backend/`):**
```bash
go install github.com/pressly/goose/v3/cmd/goose@latest   # one-time
docker compose up -d db                                    # Postgres
goose -dir migrations postgres "postgres://idp:idp@localhost:5432/idp?sslmode=disable" up
go run ./cmd/api                                           # http://localhost:8080
```
(Windows PowerShell: add Go's bin to PATH first — `$env:Path += ";$(go env GOPATH)\bin"`.)

**Terminal 2 — console (from `admin-console/`):**
```bash
npm install
npm run dev          # http://localhost:5173
```

Open **http://localhost:5173** → sign in **`admin` / `admin`**. Seeds `system` + `acme` tenants,
demo users (`jdoe`/`msmith`, OIDC password `password`), roles, and clients.

## Tests

```bash
cd admin-console && npm run test     # Vitest + RTL (MSW-backed; no backend needed)
cd backend       && go test ./...    # Go service tests (no DB needed)
```

## Status & notes

The console talks only to the backend (Vite proxies `/api → :8080`; MSW is used only by the test
suite). Each package has its own `README.md` with details. Known follow-ups (documented in
`backend/README.md`): OIDC keys/tokens are in-memory (single-instance dev), and the
`client_credentials` grant is not yet wired.
