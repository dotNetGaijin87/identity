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
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
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
  h2{margin:1.6rem 0 .6rem;font-size:1.1rem;border-bottom:1px solid #262a36;padding-bottom:.3rem}
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
  .flow{display:flex;flex-direction:column;gap:.8rem}
  .step{border:1px solid #262a36;border-left:3px solid #8b5cf6;border-radius:8px;padding:.7rem .9rem;background:#12141c}
  .step.back{border-left-color:#2dd4bf}
  .step-head{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
  .num{display:grid;place-items:center;width:1.4rem;height:1.4rem;border-radius:50%;
    background:#8b5cf6;color:#fff;font-size:.8rem;font-weight:700}
  .step.back .num{background:#2dd4bf;color:#06231f}
  .step-title{font-weight:600}
  .tag{margin-left:auto;font-size:.7rem;letter-spacing:.02em;text-transform:uppercase;
    color:#8b93a5;border:1px solid #262a36;border-radius:999px;padding:.1rem .5rem}
  .endpoint{margin:.45rem 0;font-size:.85rem;color:#c7ccd8}
  .note{margin:.3rem 0 0;font-size:.75rem;color:#e0a35e}
  table.kv{width:100%;border-collapse:collapse;margin-top:.5rem;font-size:.82rem}
  table.kv td{border-top:1px solid #20232e;padding:.3rem .4rem;vertical-align:top;word-break:break-all}
  table.kv td:first-child{color:#b69dff;width:11rem;white-space:nowrap}
  .diagram{border:1px solid #262a36;border-radius:8px;padding:1rem .5rem .6rem;background:#12141c;margin-bottom:.3rem}
  .pagehead{display:flex;align-items:center;justify-content:space-between;gap:1rem 1.2rem;flex-wrap:wrap}
  .pagehead h1{margin:0}
  .actions{display:flex;gap:.5rem;flex-wrap:wrap}
  .actions a.btn{margin:0}
  .tabs > input{display:none}
  .tabbar{display:flex;gap:.3rem;border-bottom:1px solid #262a36;margin-top:1.1rem}
  .tabbar label{padding:.5rem .9rem;cursor:pointer;font-size:.9rem;font-weight:600;color:#8b93a5;
    border-bottom:2px solid transparent;margin-bottom:-1px}
  .tabbar label:hover{color:#c7ccd8}
  #tab-flow:checked ~ .tabbar label[for="tab-flow"],
  #tab-decoded:checked ~ .tabbar label[for="tab-decoded"]{color:#e7e9f0;border-bottom-color:#8b5cf6}
  .tabpanel{display:none}
  #tab-flow:checked ~ #panel-flow,
  #tab-decoded:checked ~ #panel-decoded{display:block}
  .tabpanel h2:first-child,.tabpanel h3:first-child{margin-top:.8rem}
</style></head><body><div class="card">${body}</div></body></html>`;

const kvRows = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(String(v))}</td></tr>`)
    .join("");

// Renders one message in the OIDC exchange as a labeled timeline step.
const flowStep = ({ n, channel, title, method, target, params, body, note }) => `
  <div class="step ${channel}">
    <div class="step-head"><span class="num">${n}</span><span class="step-title">${esc(title)}</span>
      <span class="tag">${channel === "front" ? "front-channel · browser" : "back-channel · server"}</span></div>
    <div class="endpoint"><code>${esc(method)}</code> ${esc(target)}</div>
    ${note ? `<p class="note">${esc(note)}</p>` : ""}
    ${params ? `<table class="kv">${kvRows(params)}</table>` : ""}
    ${body ? `<pre>${esc(body)}</pre>` : ""}
  </div>`;

const AC_NAME = "Authorization Code + PKCE";
const CC_NAME = "Client Credentials";

// Sequence-diagram specs, one per grant. Actor x-positions are tuned per flow; the
// numbered messages line up with the timeline below each diagram.
const AC_ACTORS = [
  { id: "browser", x: 120, name: "Browser", role: "end-user" },
  { id: "app", x: 370, name: "Demo App", role: "relying party" },
  { id: "idp", x: 620, name: "IdP", role: "acme issuer" },
];
const AC_MSGS = [
  { from: "browser", to: "app", kind: "muted", label: "click “Log in”" },
  { from: "app", to: "browser", kind: "muted", label: "302 → authorize URL" },
  { from: "browser", to: "idp", kind: "front", n: 1, label: "GET /authorize" },
  { from: "idp", to: "browser", kind: "muted", label: "hosted login + consent" },
  { from: "browser", to: "app", kind: "front", n: 2, label: "302 /callback?code&state" },
  { from: "app", to: "idp", kind: "back", n: 3, label: "POST /token — code + verifier" },
  { from: "idp", to: "app", kind: "back", n: 4, label: "200 — access / id / refresh tokens" },
  { from: "app", to: "idp", kind: "back", n: 5, label: "GET /userinfo — Bearer" },
  { from: "idp", to: "app", kind: "muted", label: "200 — claims" },
];
const CC_ACTORS = [
  { id: "app", x: 230, name: "Demo App", role: "service / client" },
  { id: "idp", x: 530, name: "IdP", role: "acme issuer" },
];
const CC_MSGS = [
  { from: "app", to: "idp", kind: "back", n: 1, label: "POST /token — client_credentials" },
  { from: "idp", to: "app", kind: "back", n: 2, label: "200 — access token (opaque)" },
];

// A self-contained SVG sequence diagram. Colors match the front/back-channel split;
// the legend only shows channels actually present in this flow.
const flowDiagram = (actors, msgs) => {
  const AX = Object.fromEntries(actors.map((a) => [a.id, a.x]));
  const CH = {
    front: { stroke: "#8b5cf6", text: "#cdbbff", num: "#fff", marker: "mF" },
    back: { stroke: "#2dd4bf", text: "#9af0e3", num: "#06231f", marker: "mB" },
    muted: { stroke: "#454c5c", text: "#8b93a5", marker: "mM" },
  };

  const top = 12,
    headH = 44,
    rowTop = 92,
    rowGap = 40;
  const lifeBottom = rowTop + (msgs.length - 1) * rowGap + 20;
  const legendY = lifeBottom + 26;
  const H = legendY + 14;

  const marker = (id, fill) =>
    `<marker id="${id}" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">` +
    `<path d="M0,0 L7,3 L0,6 Z" fill="${fill}"/></marker>`;

  const headers = actors
    .map(
      (a) => `
    <rect x="${a.x - 75}" y="${top}" width="150" height="${headH}" rx="9" fill="#1c1f2a" stroke="#2c3142"/>
    <text x="${a.x}" y="${top + 19}" text-anchor="middle" font-size="13" font-weight="600" fill="#e7e9f0">${a.name}</text>
    <text x="${a.x}" y="${top + 34}" text-anchor="middle" font-size="10.5" fill="#8b93a5">${a.role}</text>
    <line x1="${a.x}" y1="${top + headH}" x2="${a.x}" y2="${lifeBottom}" stroke="#2a2f3d" stroke-width="1.2" stroke-dasharray="3 4"/>`,
    )
    .join("");

  const rows = msgs
    .map((m, i) => {
      const y = rowTop + i * rowGap;
      const c = CH[m.kind];
      const x1 = AX[m.from],
        x2 = AX[m.to];
      const dir = x2 > x1 ? 1 : -1;
      const start = x1 + dir * (m.n ? 11 : 4);
      const end = x2 - dir * 4;
      const mid = (x1 + x2) / 2;
      const muted = m.kind === "muted";
      return `
    <text x="${mid}" y="${y - 7}" text-anchor="middle" font-size="11" fill="${c.text}"${muted ? ' font-style="italic"' : ""}>${m.label}</text>
    <line x1="${start}" y1="${y}" x2="${end}" y2="${y}" stroke="${c.stroke}" stroke-width="${muted ? 1.2 : 1.7}"${muted ? ' stroke-dasharray="4 4"' : ""} marker-end="url(#${c.marker})"/>${
      m.n
        ? `<circle cx="${x1}" cy="${y}" r="10" fill="${c.stroke}"/><text x="${x1}" y="${y + 3.5}" text-anchor="middle" font-size="11" font-weight="700" fill="${c.num}">${m.n}</text>`
        : ""
    }`;
    })
    .join("");

  const kinds = new Set(msgs.map((m) => m.kind));
  const items = [];
  if (kinds.has("front")) items.push(["#8b5cf6", "front-channel · via the browser"]);
  if (kinds.has("back")) items.push(["#2dd4bf", "back-channel · server-to-server"]);
  const legend = items
    .map(([color, label], i) => {
      const x = 40 + i * 300;
      return (
        `<line x1="${x}" y1="${legendY}" x2="${x + 26}" y2="${legendY}" stroke="${color}" stroke-width="2.5"/>` +
        `<text x="${x + 34}" y="${legendY + 3.5}" font-size="10.5" fill="#8b93a5">${label}</text>`
      );
    })
    .join("");

  return `<svg viewBox="0 0 740 ${H}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,Segoe UI,Roboto,sans-serif">
    <defs>${marker("mF", "#8b5cf6")}${marker("mB", "#2dd4bf")}${marker("mM", "#454c5c")}</defs>
    ${headers}${rows}${legend}
  </svg>`;
};

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
      <code>${ISSUER_PUBLIC}</code>. Pick a grant to run and inspect every message it exchanges.</p>
      <div class="grants">
        <div class="grant">
          <h3>${AC_NAME}</h3>
          <p>The IdP authenticates an <strong>end-user</strong> in the browser, then this app
          swaps the code for tokens. Uses both front- and back-channel.</p>
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

    const flow = [
      flowStep({
        n: 1,
        channel: "back",
        title: "Token request",
        method: "POST",
        target: `${ISSUER}/oauth/token`,
        params: tokenReqBody,
        note: "The client authenticates with its own secret — sent in full here, demo only.",
      }),
      flowStep({
        n: 2,
        channel: "back",
        title: "Token response",
        method: `HTTP ${tokenRes.status}`,
        target: `${ISSUER}/oauth/token`,
        body: JSON.stringify(tok, null, 2),
      }),
    ];

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
      <h2>Flow diagram</h2>
      <div class="diagram">${flowDiagram(CC_ACTORS, CC_MSGS)}</div>
      <h2>Protocol flow</h2>
      <section class="flow">${flow.join("")}</section>`),
    );
    return;
  }

  if (url.pathname === "/login") {
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
    const authz = new URL(`${ISSUER_PUBLIC}/authorize`);
    authz.search = new URLSearchParams(authzParams).toString();
    sessions.set(state, { verifier, authzParams });
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
        <section class="flow">${flowStep({
          n: 2,
          channel: "front",
          title: "Authorization response",
          method: "GET",
          target: `${REDIRECT_URI} (callback)`,
          params: authzResponse,
        })}</section>
        <a class="btn" href="/">Back</a>`),
      );
      return;
    }
    sessions.delete(state);

    const tokenReqBody = {
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: sess.verifier,
    };
    const tokenRes = await fetch(`${ISSUER}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(tokenReqBody),
    });
    const tok = await tokenRes.json();

    const flow = [
      flowStep({
        n: 1,
        channel: "front",
        title: "Authorization request",
        method: "GET",
        target: `${ISSUER_PUBLIC}/authorize`,
        params: sess.authzParams,
      }),
      flowStep({
        n: 2,
        channel: "front",
        title: "Authorization response",
        method: "GET",
        target: `${REDIRECT_URI} (callback)`,
        params: authzResponse,
      }),
      flowStep({
        n: 3,
        channel: "back",
        title: "Token request",
        method: "POST",
        target: `${ISSUER}/oauth/token`,
        params: tokenReqBody,
        note: "PKCE code_verifier (and any client secret) sent in full here — demo only.",
      }),
      flowStep({
        n: 4,
        channel: "back",
        title: "Token response",
        method: `HTTP ${tokenRes.status}`,
        target: `${ISSUER}/oauth/token`,
        body: JSON.stringify(tok, null, 2),
      }),
    ];

    if (!tok.access_token) {
      res.statusCode = 400;
      res.end(
        page(`<h1>Token error</h1>
        <p class="muted">The token exchange failed. The full exchange is below.</p>
        <section class="flow">${flow.join("")}</section>
        <a class="btn" href="/login">Try again</a>`),
      );
      return;
    }

    const userinfoRes = await fetch(`${ISSUER}/userinfo`, {
      headers: { authorization: `Bearer ${tok.access_token}` },
    });
    const userinfo = await userinfoRes.json();
    flow.push(
      flowStep({
        n: 5,
        channel: "back",
        title: "UserInfo request",
        method: `GET → HTTP ${userinfoRes.status}`,
        target: `${ISSUER}/userinfo`,
        note: "Authorization: Bearer <access_token>",
        body: JSON.stringify(userinfo, null, 2),
      }),
    );

    const idClaims = JSON.parse(Buffer.from(tok.id_token.split(".")[1], "base64url"));

    res.end(
      page(`
      <div class="pagehead">
        <h1>${AC_NAME}</h1>
        <div class="actions">
          <a class="btn" href="/login">Log in again</a>
          <a class="btn ghost" href="/">← All grants</a>
        </div>
      </div>
      <div class="tabs">
        <input type="radio" name="tab" id="tab-flow" checked>
        <input type="radio" name="tab" id="tab-decoded">
        <div class="tabbar">
          <label for="tab-flow">Flow</label>
          <label for="tab-decoded">Decoded tokens</label>
        </div>
        <div class="tabpanel" id="panel-flow">
          <h2>Flow diagram</h2>
          <div class="diagram">${flowDiagram(AC_ACTORS, AC_MSGS)}</div>
          <h2>Protocol flow</h2>
          <section class="flow">${flow.join("")}</section>
        </div>
        <div class="tabpanel" id="panel-decoded">
          <h3>ID token claims</h3><pre>${esc(JSON.stringify(idClaims, null, 2))}</pre>
          <h3>UserInfo</h3><pre>${esc(JSON.stringify(userinfo, null, 2))}</pre>
        </div>
      </div>`),
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
