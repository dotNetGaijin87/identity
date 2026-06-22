# SPA + BFF — live cookie & token visualizer

A second relying-party demo that shows the **Backend-for-Frontend (BFF)** integration
pattern and visualizes, in real time, the **state of every cookie and token** as the
OIDC flow runs against the IdP.

Two pieces:

```
spa-bff/
├── bff/   Node BFF (zero-dep) — runs auth-code + PKCE against the IdP, holds the
│          tokens server-side, sets an httpOnly session cookie, and records a
│          per-session TRACE of typed events (with cookie values + decoded claims).
└── spa/   React + Vite + TS SPA — talks ONLY to its BFF, renders the trace as a
           live sequence diagram and shows the cookie/token state with real values.
```

## The pattern it demonstrates

- The **SPA never holds a token.** It only ever calls `/bff/*` on its own origin.
- The **BFF** does the OAuth dance with the IdP and keeps the access / id / refresh
  tokens in a **server-side session**. The browser gets nothing but an **httpOnly**
  session cookie — unreadable by JavaScript, so an XSS can't steal a token.
- You can watch the **access token rotate** on _Refresh token_, the BFF call
  **/userinfo** on your behalf, and everything tear down on _Log out_.

## What you see

- A **sequence diagram** (Browser/SPA · BFF · IdP), front-channel vs back-channel
  colour-coded, one numbered message per hop.
- **Inline value cards**: the actual `bff_session` cookie value + attributes, and
  **decoded** id/access-token claims, right in the diagram.
- Side panels for the **cookie jar** (browser) and **token store** (BFF, server-side)
  with a live **expiry countdown**.
- Click any step for the full request/response, raw token, and decoded claims.

## Run

It's wired into the root `docker-compose.yml`:

```bash
docker compose up --build          # from the repo root
```

Then open **http://localhost:4000**, press **Log in**, and sign in on the IdP as the
demo end-user **`jdoe` / `password`**. The BFF auto-registers its client
(`spa-bff-demo`, redirect `http://localhost:4000/bff/callback`) in the `acme` tenant
on startup.

Only need this demo (plus its dependencies)?

```bash
docker compose up --build db backend bff spa
```

## Local dev (without Docker)

```bash
# 1) IdP backend (see backend/README.md): Postgres + `go run ./cmd/api`  → :8080
# 2) BFF:
cd spa-bff/bff && PUBLIC_ORIGIN=http://localhost:4000 node server.mjs   # → :4001
# 3) SPA (Vite proxies /bff → :4001, dev server on :4000):
cd spa-bff/spa && npm install && npm run dev                            # → :4000
```

> Behind a TLS-intercepting proxy/AV (e.g. Avast)? See `spa/ca/README.md` — the same
> root-CA trick the admin-console uses, so `npm ci` works inside Docker.
