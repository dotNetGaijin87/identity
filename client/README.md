# Demo Client (OIDC relying party)

A tiny app that logs an **end-user** into a tenant via the IdP — to test the full
OpenID Connect flow (distinct from the admin console, which is for managing the IdP).

- Zero dependencies (Node 20+ built-ins only).
- **Auto-registers** itself as a public client (`demo-app`, redirect
  `http://localhost:3000/callback`, PKCE) in the `acme` tenant on startup.
- Runs the **authorization-code + PKCE** flow; the code→token exchange happens
  server-side, so there are no browser CORS concerns.

## Run

1. Make sure the **backend is running** (`idp/backend`: Postgres + `go run ./cmd/api`).
2. Start this app:
   ```bash
   cd idp/client
   node server.mjs        #  → http://localhost:3000
   ```
3. Open **http://localhost:3000**, click **“Log in with the IdP”**, and sign in on the
   IdP's hosted page as the demo end-user **`jdoe` / `password`**.
4. You'll be redirected back and shown the user's **UserInfo**, **ID-token claims**, and the
   issued **tokens**.

## What it demonstrates

```
browser → /login → IdP /authorize → IdP hosted login (jdoe/password)
        → /callback → POST /oauth/token (PKCE) → GET /userinfo → render
```

## Config (env vars, all optional)

| Var | Default | Meaning |
|-----|---------|---------|
| `PORT` | `3000` | this app's port (must match the registered redirect URI) |
| `API_URL` | `http://localhost:8080` | the IdP backend |
| `TENANT` | `acme` | which tenant's issuer to log into (`/oidc/{tenant}`) |

> The end-user (`jdoe`) is different from the admin console login (`admin`). The admin
> manages the IdP; `jdoe` is a user *of the acme tenant* that apps authenticate.
