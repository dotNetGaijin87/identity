// BFF for the SPA visualizer. The SPA talks ONLY to this server (same origin); the
// BFF runs the real OIDC Authorization Code + PKCE flow against the IdP, keeps every
// token server-side, and hands the browser nothing but an httpOnly session cookie.
//
// It also records a per-session TRACE — an ordered list of typed events with the
// real cookie value and decoded token claims embedded — which the SPA renders as a
// live diagram. (Surfacing token claims to the SPA is a deliberate teaching choice;
// a production BFF would keep them entirely internal.)
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT || 4001);
// API = server-side IdP origin (Docker: http://backend:8080). PUBLIC_BASE = the
// browser-facing IdP origin used in redirects. PUBLIC_ORIGIN = where the browser
// reaches THIS app (the SPA/nginx origin), used to build the redirect URI.
const API = process.env.API_URL || "http://localhost:8080";
const PUBLIC_BASE = process.env.PUBLIC_BASE || API;
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || "http://localhost:4000";
const TENANT = process.env.TENANT || "acme";
const ISSUER = `${API}/oidc/${TENANT}`; // server-side calls
const ISSUER_PUBLIC = `${PUBLIC_BASE}/oidc/${TENANT}`; // browser redirects
const CLIENT_ID = "spa-bff-demo";
const REDIRECT_URI = `${PUBLIC_ORIGIN}/bff/callback`;
const SCOPE = "openid profile email offline_access";
const COOKIE = "bff_session";
const SESSION_TTL = 3600; // seconds

const b64url = (b) => Buffer.from(b).toString("base64url");
const jsonFromB64url = (s) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

// sessionId -> { trace: Event[], seq, tokens, tokenMeta, user, createdAt }
const sessions = new Map();
// state -> { verifier, authzParams, events } for an in-flight login
const pending = new Map();

function makePkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

// Decode a compact JWT into {header, payload}; returns null for opaque tokens.
function decodeJwt(token) {
  try {
    const [h, p] = token.split(".");
    if (!h || !p) return null;
    return { header: jsonFromB64url(h), payload: jsonFromB64url(p) };
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const COOKIE_ATTRS = { httpOnly: true, sameSite: "Lax", path: "/", secure: false, maxAge: SESSION_TTL };
const setCookieHeader = (value, maxAge = SESSION_TTL) =>
  `${COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

// Append a trace event. `target` is the in-flight login entry or the session; both
// carry { trace: [], seq } and share the same array so the timeline is continuous.
function record(target, ev) {
  target.trace.push({ ...ev, seq: target.seq, ts: Date.now() });
  target.seq += 1;
}

// Build the token snapshot the SPA shows. Tokens stay here; the SPA gets claims +
// (for the demo) the raw compact value so it can show "the token".
function tokenSnapshot(tok) {
  const id = tok.id_token ? { present: true, type: "JWT", value: tok.id_token, ...decodeJwt(tok.id_token) } : null;
  const accDecoded = tok.access_token ? decodeJwt(tok.access_token) : null;
  const access = tok.access_token
    ? {
        present: true,
        type: accDecoded ? "JWT" : "opaque",
        value: tok.access_token,
        ...(accDecoded || {}),
        expiresAt: tok.expires_in ? Date.now() + tok.expires_in * 1000 : accDecoded?.payload?.exp ? accDecoded.payload.exp * 1000 : null,
      }
    : null;
  const refresh = tok.refresh_token ? { present: true, value: tok.refresh_token } : null;
  return { id, access, refresh };
}

async function tokenRequest(grantBody) {
  const res = await fetch(`${ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(grantBody),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

function sessionView(sess) {
  if (!sess) return { authenticated: false, cookie: null, tokens: { id: null, access: null, refresh: null }, user: null, trace: [] };
  return {
    authenticated: true,
    cookie: { name: COOKIE, value: sess.id, attributes: COOKIE_ATTRS },
    tokens: sess.tokens,
    user: sess.user,
    trace: sess.trace,
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, PUBLIC_ORIGIN);
  const path = url.pathname;
  const cookies = parseCookies(req);
  const sess = cookies[COOKIE] && sessions.get(cookies[COOKIE]);

  // ── current session state + recorded trace ──────────────────────────────────
  if (path === "/bff/session" && req.method === "GET") {
    return sendJson(res, 200, sessionView(sess));
  }

  // ── start login: PKCE + redirect to the IdP (front-channel) ─────────────────
  if (path === "/bff/login" && req.method === "GET") {
    const { verifier, challenge } = makePkce();
    const state = b64url(crypto.randomBytes(16));
    const authzParams = {
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: SCOPE,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    };
    const entry = { verifier, authzParams, trace: [], seq: 0 };
    record(entry, {
      kind: "request",
      channel: "app",
      from: "browser",
      to: "bff",
      method: "GET",
      url: `${PUBLIC_ORIGIN}/bff/login`,
      group: "login",
      label: "GET /bff/login",
      note: "BFF pattern: the SPA only ever talks to its own BFF — never to the IdP directly, and it holds no tokens.",
    });
    record(entry, {
      kind: "pkce",
      channel: "internal",
      from: "bff",
      to: "bff",
      group: "login",
      label: "PKCE challenge created",
      note: "S256 code_challenge sent to the IdP; the code_verifier stays on the BFF.",
      params: { code_challenge: challenge, code_challenge_method: "S256" },
    });
    const authz = new URL(`${ISSUER_PUBLIC}/authorize`);
    authz.search = new URLSearchParams(authzParams).toString();
    record(entry, {
      kind: "response",
      channel: "app",
      from: "bff",
      to: "browser",
      status: 302,
      group: "login",
      label: "302 → IdP /authorize",
      note: "The BFF responds with a redirect. The browser will follow it to the IdP.",
    });
    record(entry, {
      kind: "request",
      channel: "front",
      from: "browser",
      to: "idp",
      method: "GET",
      url: authz.toString(),
      group: "login",
      label: "GET /authorize (+ PKCE challenge)",
      params: authzParams,
      note: "Front-channel: the browser loads the IdP's hosted login. The BFF does not see this hop.",
    });
    pending.set(state, entry);
    res.writeHead(302, { location: authz.toString() });
    res.end();
    return;
  }

  // ── callback: exchange code → tokens, create session, set httpOnly cookie ────
  if (path === "/bff/callback" && req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const entry = state && pending.get(state);
    if (!code || !entry) {
      res.writeHead(302, { location: `${PUBLIC_ORIGIN}/?error=invalid_callback` });
      res.end();
      return;
    }
    pending.delete(state);
    // Reconstruct the front-channel hops that just happened on the IdP's hosted
    // login. The BFF doesn't directly observe these, but a valid code proves them.
    record(entry, {
      kind: "response",
      channel: "front",
      from: "idp",
      to: "browser",
      status: 200,
      group: "login",
      label: "200 hosted login page",
      note: "The IdP renders its OWN login form. The BFF never sees it.",
    });
    record(entry, {
      kind: "request",
      channel: "front",
      from: "browser",
      to: "idp",
      method: "POST",
      url: `${ISSUER_PUBLIC}/login`,
      group: "login",
      label: "POST /login (credentials)",
      note: "The user authenticates ON THE IDP — username/password never touch the SPA or the BFF.",
    });
    record(entry, {
      kind: "response",
      channel: "front",
      from: "idp",
      to: "browser",
      status: 302,
      group: "login",
      label: "302 → /bff/callback (+ code)  ·  Set-Cookie: idp_sso",
      cookie: {
        name: "idp_sso",
        value: "(httpOnly, on the issuer origin — not visible to the BFF)",
        attributes: { httpOnly: true, sameSite: "Lax", path: `/oidc/${TENANT}`, secure: false, maxAge: -1 },
      },
      note: "One response to the login POST does both: the IdP sets its own SSO cookie (idp_sso, scoped to the issuer origin) AND redirects the browser back to the BFF with the authorization code.",
    });
    record(entry, {
      kind: "request",
      channel: "app",
      from: "browser",
      to: "bff",
      method: "GET",
      url: `${REDIRECT_URI}`,
      group: "login",
      label: "GET /bff/callback (+ code)",
      params: Object.fromEntries(url.searchParams),
      note: "The browser delivers the authorization code to the BFF callback (observed).",
    });

    const tokenReqBody = {
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: entry.verifier,
    };
    record(entry, {
      kind: "request",
      channel: "back",
      from: "bff",
      to: "idp",
      method: "POST",
      url: `${ISSUER}/oauth/token`,
      group: "login",
      label: "POST /oauth/token (code + verifier)",
      params: tokenReqBody,
      note: "Back-channel: the BFF swaps the code for tokens. Never passes through the browser.",
    });
    const { status, data: tok } = await tokenRequest(tokenReqBody);
    record(entry, {
      kind: "response",
      channel: "back",
      from: "idp",
      to: "bff",
      status,
      group: "login",
      label: `HTTP ${status} ← /oauth/token`,
      body: JSON.stringify(tok, null, 2),
    });
    if (!tok.access_token) {
      record(entry, { kind: "error", channel: "internal", from: "bff", to: "bff", group: "login", label: "Token exchange failed" });
      res.writeHead(302, { location: `${PUBLIC_ORIGIN}/?error=token` });
      res.end();
      return;
    }

    // Create the session, store tokens server-side, decode for display.
    const id = b64url(crypto.randomBytes(24));
    const tokens = tokenSnapshot(tok);
    const sessNew = { id, trace: entry.trace, seq: entry.seq, tokens, raw: tok, user: tokens.id?.payload || null, createdAt: Date.now() };

    if (tokens.id)
      record(sessNew, {
        kind: "token",
        channel: "internal",
        from: "bff",
        to: "bff",
        group: "login",
        label: "id_token received & decoded",
        token: { kind: "id", type: "JWT", value: tokens.id.value, claims: tokens.id.payload },
        note: "ID token decoded for the user's identity. Held on the BFF — never sent to the SPA.",
      });
    record(sessNew, {
      kind: "token",
      channel: "internal",
      from: "bff",
      to: "bff",
      group: "login",
      label: `access_token stored (${tokens.access.type})`,
      token: { kind: "access", type: tokens.access.type, value: tokens.access.value, claims: tokens.access.payload || null, expiresAt: tokens.access.expiresAt },
      note: "Access token kept server-side; the BFF attaches it to API calls on the SPA's behalf.",
    });
    if (tokens.refresh)
      record(sessNew, {
        kind: "token",
        channel: "internal",
        from: "bff",
        to: "bff",
        group: "login",
        label: "refresh_token stored",
        token: { kind: "refresh", value: tokens.refresh.value },
        note: "Refresh token NEVER reaches the browser — the core security win of the BFF pattern.",
      });
    record(sessNew, {
      kind: "cookie",
      channel: "app",
      from: "bff",
      to: "browser",
      group: "login",
      label: "Set-Cookie: bff_session (httpOnly)",
      cookie: { name: COOKIE, value: id, attributes: COOKIE_ATTRS },
      note: "The browser receives ONLY this opaque httpOnly cookie. JS cannot read it (no XSS token theft).",
    });
    record(sessNew, {
      kind: "redirect",
      channel: "app",
      from: "bff",
      to: "browser",
      method: "GET",
      url: `${PUBLIC_ORIGIN}/`,
      group: "login",
      label: "302 → SPA /",
      note: "Browser returns to the SPA, now carrying only the session cookie.",
    });

    sessions.set(id, sessNew);
    res.writeHead(302, { location: `${PUBLIC_ORIGIN}/`, "set-cookie": setCookieHeader(id) });
    res.end();
    return;
  }

  // ── refresh the access token using the stored refresh token ──────────────────
  if (path === "/bff/refresh" && req.method === "POST") {
    if (!sess || !sess.raw.refresh_token) return sendJson(res, 401, { error: "no_session_or_refresh" });
    record(sess, {
      kind: "request",
      channel: "app",
      from: "browser",
      to: "bff",
      method: "POST",
      url: `${PUBLIC_ORIGIN}/bff/refresh`,
      group: "refresh",
      label: "POST /bff/refresh",
      note: "The SPA asks its BFF to refresh — it has no idea a refresh token even exists.",
    });
    const body = { grant_type: "refresh_token", refresh_token: sess.raw.refresh_token, client_id: CLIENT_ID, scope: SCOPE };
    record(sess, {
      kind: "request",
      channel: "back",
      from: "bff",
      to: "idp",
      method: "POST",
      url: `${ISSUER}/oauth/token`,
      group: "refresh",
      label: "POST /oauth/token (refresh_token)",
      params: body,
      note: "Back-channel: the BFF rotates the access token using the refresh token it holds.",
    });
    const { status, data: tok } = await tokenRequest(body);
    record(sess, { kind: "response", channel: "back", from: "idp", to: "bff", status, group: "refresh", label: `HTTP ${status} ← /oauth/token`, body: JSON.stringify(tok, null, 2) });
    if (tok.access_token) {
      sess.raw = { ...sess.raw, ...tok };
      sess.tokens = tokenSnapshot(sess.raw);
      record(sess, {
        kind: "token",
        channel: "internal",
        from: "bff",
        to: "bff",
        group: "refresh",
        label: "access_token rotated",
        token: { kind: "access", type: sess.tokens.access.type, value: sess.tokens.access.value, claims: sess.tokens.access.payload || null, expiresAt: sess.tokens.access.expiresAt },
        note: "New access token stored. Note the value changed — same session cookie, fresh token.",
      });
    } else {
      record(sess, { kind: "error", channel: "internal", from: "bff", to: "bff", group: "refresh", label: "Refresh failed" });
    }
    record(sess, {
      kind: "response",
      channel: "app",
      from: "bff",
      to: "browser",
      status: 200,
      group: "refresh",
      label: "200 ← /bff/refresh",
      note: "The SPA just gets an OK — no token crosses the boundary, only the cookie persists.",
    });
    return sendJson(res, 200, sessionView(sess));
  }

  // ── call the IdP UserInfo endpoint with the stored access token ──────────────
  if (path === "/bff/userinfo" && req.method === "GET") {
    if (!sess) return sendJson(res, 401, { error: "no_session" });
    record(sess, {
      kind: "request",
      channel: "app",
      from: "browser",
      to: "bff",
      method: "GET",
      url: `${PUBLIC_ORIGIN}/bff/userinfo`,
      group: "userinfo",
      label: "GET /bff/userinfo",
      note: "The SPA asks its BFF for the user's profile.",
    });
    record(sess, {
      kind: "request",
      channel: "back",
      from: "bff",
      to: "idp",
      method: "GET",
      url: `${ISSUER}/userinfo`,
      group: "userinfo",
      label: "GET /userinfo (Bearer access_token)",
      note: "Back-channel: the BFF attaches its stored access token as the Bearer credential.",
    });
    const r = await fetch(`${ISSUER}/userinfo`, { headers: { authorization: `Bearer ${sess.raw.access_token}` } });
    const info = await r.json().catch(() => ({}));
    record(sess, { kind: "userinfo", channel: "back", from: "idp", to: "bff", status: r.status, group: "userinfo", label: `HTTP ${r.status} ← /userinfo`, body: JSON.stringify(info, null, 2), note: "Claims returned to the BFF." });
    record(sess, {
      kind: "response",
      channel: "app",
      from: "bff",
      to: "browser",
      status: 200,
      group: "userinfo",
      label: "200 ← /bff/userinfo",
      body: JSON.stringify(info, null, 2),
      note: "The BFF forwards a safe subset of claims to the SPA — still no token.",
    });
    return sendJson(res, 200, { userinfo: info, session: sessionView(sess) });
  }

  // ── logout: drop the session and expire the cookie ──────────────────────────
  if (path === "/bff/logout" && req.method === "POST") {
    if (sess) {
      record(sess, {
        kind: "request",
        channel: "app",
        from: "browser",
        to: "bff",
        method: "POST",
        url: `${PUBLIC_ORIGIN}/bff/logout`,
        group: "logout",
        label: "POST /bff/logout",
        note: "The SPA asks its BFF to end the session.",
      });
      record(sess, { kind: "cookie", channel: "app", from: "bff", to: "browser", group: "logout", label: "Set-Cookie: bff_session=; Max-Age=0", cookie: { name: COOKIE, value: "", attributes: { ...COOKIE_ATTRS, maxAge: 0 } }, note: "Cookie expired on the browser." });
      record(sess, { kind: "logout", channel: "internal", from: "bff", to: "bff", group: "logout", label: "Session + tokens destroyed", note: "The server session is dropped and every token discarded." });
      record(sess, { kind: "response", channel: "app", from: "bff", to: "browser", status: 200, group: "logout", label: "200 ← /bff/logout", note: "The SPA returns to the anonymous state." });
      const finalTrace = sess.trace;
      sessions.delete(sess.id);
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "set-cookie": setCookieHeader("", 0) });
      res.end(JSON.stringify({ authenticated: false, cookie: null, tokens: { id: null, access: null, refresh: null }, user: null, trace: finalTrace }));
      return;
    }
    return sendJson(res, 200, sessionView(null));
  }

  if (path === "/bff/health") return sendJson(res, 200, { ok: true });

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

// Auto-register this BFF's OIDC client in the IdP (public client + PKCE, like a
// browser app would be — but here the BFF is the confidential boundary in practice
// because tokens never leave the server).
async function ensureClient() {
  const login = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin" }),
  });
  if (!login.ok) throw new Error(`admin login failed — is the IdP up at ${API}?`);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const tenants = await (await fetch(`${API}/api/tenants`, { headers: { cookie } })).json();
  const tenant = tenants.find((t) => t.name === TENANT);
  if (!tenant) throw new Error(`tenant "${TENANT}" not found`);
  const clientsURL = `${API}/api/tenants/${tenant.id}/clients`;
  const clients = await (await fetch(clientsURL, { headers: { cookie } })).json();
  if (clients.find((c) => c.clientId === CLIENT_ID)) {
    console.log(`✓ client "${CLIENT_ID}" already registered in "${TENANT}"`);
    return;
  }
  const res = await fetch(clientsURL, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      clientId: CLIENT_ID,
      enabled: true,
      name: "SPA + BFF Demo",
      publicClient: true,
      redirectUris: [REDIRECT_URI],
      defaultScopes: ["openid", "profile", "email"],
      pkce: "S256",
    }),
  });
  if (!res.ok) throw new Error(`failed to register "${CLIENT_ID}": ${await res.text()}`);
  console.log(`✓ registered client "${CLIENT_ID}" (redirect ${REDIRECT_URI})`);
}

async function ensureClientWithRetry(attempts = 30) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await ensureClient();
      return;
    } catch (err) {
      if (i === attempts) throw err;
      console.log(`waiting for IdP at ${API} (${i}/${attempts})…`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

ensureClientWithRetry()
  .then(() => server.listen(PORT, () => console.log(`\nBFF running → http://localhost:${PORT} (public origin ${PUBLIC_ORIGIN})\n`)))
  .catch((err) => {
    console.error("startup failed:", err.message);
    process.exit(1);
  });
