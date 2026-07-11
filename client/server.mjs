import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT || 3000);
// API is the server-side backend origin; PUBLIC_BASE is the browser-facing origin
// for redirects. They differ under Docker (API=http://backend:8080,
// PUBLIC_BASE=http://localhost:8080) and match for a plain local run.
const API = process.env.API_URL || "http://localhost:8080";
const PUBLIC_BASE = process.env.PUBLIC_BASE || API;
const TENANT = process.env.TENANT || "acme";
const ISSUER = `${API}/oidc/${TENANT}`;
const ISSUER_PUBLIC = `${PUBLIC_BASE}/oidc/${TENANT}`;
const CLIENT_ID = "demo-app";
const CLIENT_ID2 = "demo-portal";
// The two public auth-code clients, so SSO across them can be demonstrated.
const AC_CLIENTS = { [CLIENT_ID]: "Demo App", [CLIENT_ID2]: "Portal" };
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = "openid profile email offline_access";
const SERVICE_CLIENT_ID = "demo-service";
const SERVICE_SCOPE = "api.read";
let serviceSecret = "";

const b64url = (b) => Buffer.from(b).toString("base64url");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sessions = new Map();

function makePkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

const page = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Demo App</title>
<style>
  body{font-family:system-ui,Segoe UI,Roboto,sans-serif;background:#0d0e13;color:#e7e9f0;
    min-height:100vh;display:grid;place-items:center;margin:0;padding:2rem}
  .card{background:#15171f;border:1px solid #262a36;border-radius:12px;padding:2rem;max-width:820px;width:100%;
    box-shadow:0 18px 50px rgba(139,92,246,.12)}
  h1{margin:.2rem 0 1rem} h3{margin:1.2rem 0 .4rem;color:#b69dff}
  a.btn{display:inline-block;margin-top:1rem;margin-right:.5rem;padding:.6rem 1.1rem;background:#8b5cf6;
    color:#fff;border-radius:8px;text-decoration:none;font-weight:600}
  a.btn.teal{background:#2dd4bf;color:#06231f}
  a.btn.ghost{background:transparent;color:#8b93a5;border:1px solid #262a36}
  .grants{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1.2rem}
  .grant{border:1px solid #262a36;border-radius:10px;padding:1.1rem;background:#12141c;display:flex;flex-direction:column}
  .grant h3{margin:0 0 .35rem;color:#e7e9f0}
  .grant p{margin:0 0 1rem;font-size:.85rem;color:#8b93a5;flex:1}
  .grant a.btn{margin:0;text-align:center}
  pre{background:#1c1f2a;border:1px solid #262a36;border-radius:8px;padding:.75rem;overflow:auto;font-size:.85rem}
  .muted{color:#8b93a5} code{background:rgba(139,92,246,.16);color:#b69dff;padding:.05rem .35rem;border-radius:4px}
  .pagehead{display:flex;align-items:center;justify-content:space-between;gap:1rem 1.2rem;flex-wrap:wrap}
  .pagehead h1{margin:0}
  .actions{display:flex;gap:.5rem;flex-wrap:wrap}
  .actions a.btn{margin:0}
</style></head><body><div class="card">${body}</div></body></html>`;

const AC_NAME = "Authorization Code + PKCE";
const CC_NAME = "Client Credentials";

async function ensureClients() {
  const login = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin" }),
  });
  if (!login.ok) throw new Error("admin login failed — is the backend running on " + API + "?");
  const cookie = login.headers.get("set-cookie").split(";")[0];

  const tenants = await (await fetch(`${API}/api/tenants`, { headers: { cookie } })).json();
  const tenant = tenants.find((t) => t.name === TENANT);
  if (!tenant) throw new Error(`tenant "${TENANT}" not found`);

  const clientsURL = `${API}/api/tenants/${tenant.id}/clients`;
  const clients = await (await fetch(clientsURL, { headers: { cookie } })).json();

  // upsert returns the client record (with secret, for confidential clients).
  const ensure = async (clientId, body) => {
    const existing = clients.find((c) => c.clientId === clientId);
    if (existing) {
      console.log(`✓ client "${clientId}" already registered in tenant "${TENANT}"`);
      return existing;
    }
    const res = await fetch(clientsURL, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ clientId, enabled: true, ...body }),
    });
    if (!res.ok) throw new Error(`failed to register "${clientId}": ` + (await res.text()));
    console.log(`✓ registered client "${clientId}" in tenant "${TENANT}"`);
    return res.json();
  };

  await ensure(CLIENT_ID, {
    name: "Demo App",
    publicClient: true,
    redirectUris: [REDIRECT_URI],
    defaultScopes: ["openid", "profile", "email"],
    pkce: "S256",
  });

  await ensure(CLIENT_ID2, {
    name: "Portal",
    publicClient: true,
    redirectUris: [REDIRECT_URI],
    defaultScopes: ["openid", "profile", "email"],
    pkce: "S256",
  });

  const svc = await ensure(SERVICE_CLIENT_ID, {
    name: "Demo Service",
    publicClient: false,
    serviceAccounts: true,
    defaultScopes: [SERVICE_SCOPE],
    pkce: "none",
  });
  serviceSecret = svc.secret || "";
  if (!serviceSecret) throw new Error(`no secret returned for "${SERVICE_CLIENT_ID}"`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader("content-type", "text/html; charset=utf-8");

  if (url.pathname === "/") {
    res.end(
      page(`<h1>Demo App</h1>
      <p class="muted">A relying party for the IdP — tenant <code>${TENANT}</code>, issuer
      <code>${ISSUER_PUBLIC}</code>. Pick a grant to run against the IdP.</p>
      <div class="grants">
        <div class="grant">
          <h3>${AC_NAME}</h3>
          <p>The IdP authenticates an <strong>end-user</strong> in the browser, then this app
          swaps the code for tokens. Sign in once, then open a second app with no prompt (SSO).</p>
          <a class="btn" href="/login">Run flow →</a>
        </div>
        <div class="grant">
          <h3>${CC_NAME}</h3>
          <p>This app authenticates as <strong>itself</strong> with a secret and gets an access
          token directly. No user, no browser — back-channel only.</p>
          <a class="btn teal" href="/cc">Run flow →</a>
        </div>
      </div>
      <p class="muted" style="margin-top:1.2rem">Demo end-user (for the code flow):
      <code>jdoe</code> / <code>password</code></p>`),
    );
    return;
  }

  if (url.pathname === "/cc") {
    const tokenReqBody = {
      grant_type: "client_credentials",
      client_id: SERVICE_CLIENT_ID,
      client_secret: serviceSecret,
      scope: SERVICE_SCOPE,
    };
    const tokenRes = await fetch(`${ISSUER}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(tokenReqBody),
    });
    const tok = await tokenRes.json();
    const ok = !!tok.access_token;

    res.statusCode = ok ? 200 : 400;
    res.end(
      page(`
      <div class="pagehead">
        <h1>${CC_NAME}</h1>
        <div class="actions">
          <a class="btn teal" href="/cc">Run again</a>
          <a class="btn ghost" href="/">← All grants</a>
        </div>
      </div>
      <p class="muted">The client authenticated as itself with its secret and received an access token.</p>
      <h3>Token response</h3>
      <pre>${esc(JSON.stringify(tok, null, 2))}</pre>`),
    );
    return;
  }

  if (url.pathname === "/login") {
    const requested = url.searchParams.get("client");
    const clientId = AC_CLIENTS[requested] ? requested : CLIENT_ID;
    const { verifier, challenge } = makePkce();
    const state = b64url(crypto.randomBytes(16));
    const authzParams = {
      response_type: "code",
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      scope: SCOPE,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    };
    const authz = new URL(`${ISSUER_PUBLIC}/authorize`);
    authz.search = new URLSearchParams(authzParams).toString();
    sessions.set(state, { verifier, authzParams, clientId });
    res.writeHead(302, { location: authz.toString() });
    res.end();
    return;
  }

  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const sess = state && sessions.get(state);
    const authzResponse = Object.fromEntries(url.searchParams);
    if (!code || !sess) {
      res.statusCode = 400;
      res.end(
        page(`<h1>Invalid callback</h1>
        <p class="muted">The authorization response is missing a <code>code</code> or an
        unknown <code>state</code> came back.</p>
        <pre>${esc(JSON.stringify(authzResponse, null, 2))}</pre>
        <a class="btn" href="/">Back</a>`),
      );
      return;
    }
    sessions.delete(state);

    const tokenReqBody = {
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: sess.clientId || CLIENT_ID,
      code_verifier: sess.verifier,
    };
    const tokenRes = await fetch(`${ISSUER}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(tokenReqBody),
    });
    const tok = await tokenRes.json();

    if (!tok.access_token) {
      res.statusCode = 400;
      res.end(
        page(`<h1>Token error</h1>
        <p class="muted">The token exchange failed.</p>
        <pre>${esc(JSON.stringify(tok, null, 2))}</pre>
        <a class="btn" href="/login">Try again</a>`),
      );
      return;
    }

    const userinfoRes = await fetch(`${ISSUER}/userinfo`, {
      headers: { authorization: `Bearer ${tok.access_token}` },
    });
    const userinfo = await userinfoRes.json();

    const idClaims = JSON.parse(Buffer.from(tok.id_token.split(".")[1], "base64url"));
    const currentId = sess.clientId || CLIENT_ID;
    const otherId = currentId === CLIENT_ID ? CLIENT_ID2 : CLIENT_ID;

    res.end(
      page(`
      <div class="pagehead">
        <h1>${AC_NAME}</h1>
        <div class="actions">
          <a class="btn teal" href="/login?client=${otherId}">Open ${AC_CLIENTS[otherId]} via SSO →</a>
          <a class="btn ghost" href="/login?client=${currentId}">Log in again</a>
          <a class="btn ghost" href="/">← All grants</a>
        </div>
      </div>
      <p class="muted">Signed into <strong>${AC_CLIENTS[currentId]}</strong>. Opening
      <strong>${AC_CLIENTS[otherId]}</strong> reuses this SSO session — no second password prompt.</p>
      <h3>ID token claims</h3><pre>${esc(JSON.stringify(idClaims, null, 2))}</pre>
      <h3>UserInfo</h3><pre>${esc(JSON.stringify(userinfo, null, 2))}</pre>`),
    );
    return;
  }

  res.statusCode = 404;
  res.end(page("<h1>404</h1>"));
});

async function ensureClientsWithRetry(attempts = 30) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await ensureClients();
      return;
    } catch (err) {
      if (i === attempts) throw err;
      console.log(`waiting for backend at ${API} (${i}/${attempts})…`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

ensureClientsWithRetry()
  .then(() =>
    server.listen(PORT, () => {
      console.log(`\nDemo App running → http://localhost:${PORT}`);
      console.log(`Sign in as the end-user:  jdoe / password\n`);
    }),
  )
  .catch((err) => {
    console.error("startup failed:", err.message);
    process.exit(1);
  });
