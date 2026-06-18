# Demo Client (OIDC relying party)

A tiny app that exercises the IdP's OIDC endpoints and **inspects every message** exchanged —
a sequence diagram plus a request/response timeline for each grant (distinct from the admin
console, which manages the IdP).

- Zero dependencies (Node 20+ built-ins only).
- **Auto-registers** its clients in the `acme` tenant on startup:
  - `demo-app` / `demo-portal` — two public auth-code clients (PKCE, redirect
    `http://localhost:3000/callback`), so **SSO** across apps can be demonstrated.
  - `demo-service` — confidential service-account client (client-credentials flow); its secret is
    read back from the management API.
- Runs two grants, each on its own inspector page:
  - **Authorization Code + PKCE** — the IdP authenticates an end-user in the browser, then the app
    swaps the code for tokens server-side (front- and back-channel). Decoded ID-token claims and
    UserInfo are shown on a second tab. After signing in, "Open Portal via SSO" opens the second
    client with **no second password prompt** (the IdP sets an SSO session cookie).
  - **Client Credentials** — the app authenticates as itself with its secret and gets an access
    token directly (back-channel only, no user).

## Run

1. Make sure the **backend is running** (`idp/backend`: Postgres + `go run ./cmd/api`).
2. Start this app:
   ```bash
   cd idp/client
   node server.mjs        #  → http://localhost:3000
   ```
3. Open **http://localhost:3000** and pick a grant:
   - **Authorization Code + PKCE** — sign in on the IdP's hosted page as the demo end-user
     **`jdoe` / `password`**; you're redirected back to the flow inspector (diagram, every message,
     and the decoded tokens on a second tab).
   - **Client Credentials** — runs immediately and shows the two-message back-channel exchange.

## What it demonstrates

**Authorization Code + PKCE**
```
browser → /login → IdP /authorize → IdP hosted login (jdoe/password)
        → /callback → POST /oauth/token (PKCE) → GET /userinfo → render
```

**Client Credentials**
```
/cc → POST /oauth/token (client_id + secret) → access token → render
```

## Config (env vars, all optional)

| Var           | Default                 | Meaning                                                            |
| ------------- | ----------------------- | ----------------------------------------------------------------- |
| `PORT`        | `3000`                  | this app's port (must match the registered redirect URI)          |
| `API_URL`     | `http://localhost:8080` | the IdP backend, for server-side calls (token, userinfo, admin)   |
| `PUBLIC_BASE` | `$API_URL`              | browser-facing issuer origin for redirects (differs under Docker) |
| `TENANT`      | `acme`                  | which tenant's issuer to use (`/oidc/{tenant}`)                    |
