import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 3000);
// API is the server-side backend origin; PUBLIC_BASE is the browser-facing origin
// for redirects. They differ under Docker (API=http://backend:8080,
// PUBLIC_BASE=http://localhost:8080) and match for a plain local run.
const API = process.env.API_URL || 'http://localhost:8080';
const PUBLIC_BASE = process.env.PUBLIC_BASE || API;
const TENANT = process.env.TENANT || 'acme';
const ISSUER = `${API}/oidc/${TENANT}`;
const ISSUER_PUBLIC = `${PUBLIC_BASE}/oidc/${TENANT}`;
const CLIENT_ID = 'demo-app';
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = 'openid profile email offline_access';

const b64url = (b) => Buffer.from(b).toString('base64url');
const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sessions = new Map();

function makePkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

const page = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Demo App</title>
<style>
  body{font-family:system-ui,Segoe UI,Roboto,sans-serif;background:#0d0e13;color:#e7e9f0;
    min-height:100vh;display:grid;place-items:center;margin:0;padding:2rem}
  .card{background:#15171f;border:1px solid #262a36;border-radius:12px;padding:2rem;max-width:640px;width:100%;
    box-shadow:0 18px 50px rgba(139,92,246,.12)}
  h1{margin:.2rem 0 1rem} h3{margin:1.2rem 0 .4rem;color:#b69dff}
  a.btn{display:inline-block;margin-top:1rem;padding:.6rem 1.1rem;background:#8b5cf6;color:#fff;
    border-radius:8px;text-decoration:none;font-weight:600}
  pre{background:#1c1f2a;border:1px solid #262a36;border-radius:8px;padding:.75rem;overflow:auto;font-size:.85rem}
  .muted{color:#8b93a5} code{background:rgba(139,92,246,.16);color:#b69dff;padding:.05rem .35rem;border-radius:4px}
</style></head><body><div class="card">${body}</div></body></html>`;

async function ensureClient() {
  const login = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  });
  if (!login.ok) throw new Error('admin login failed — is the backend running on ' + API + '?');
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const tenants = await (await fetch(`${API}/api/tenants`, { headers: { cookie } })).json();
  const tenant = tenants.find((t) => t.name === TENANT);
  if (!tenant) throw new Error(`tenant "${TENANT}" not found`);

  const clients = await (await fetch(`${API}/api/tenants/${tenant.id}/clients`, { headers: { cookie } })).json();
  if (clients.some((c) => c.clientId === CLIENT_ID)) {
    console.log(`✓ client "${CLIENT_ID}" already registered in tenant "${TENANT}"`);
    return;
  }
  const res = await fetch(`${API}/api/tenants/${tenant.id}/clients`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      clientId: CLIENT_ID, name: 'Demo App', publicClient: true, enabled: true,
      redirectUris: [REDIRECT_URI], defaultScopes: ['openid', 'profile', 'email'], pkce: 'S256',
    }),
  });
  if (!res.ok) throw new Error('failed to register client: ' + (await res.text()));
  console.log(`✓ registered client "${CLIENT_ID}" (redirect ${REDIRECT_URI}) in tenant "${TENANT}"`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader('content-type', 'text/html; charset=utf-8');

  if (url.pathname === '/') {
    res.end(page(`<h1>Demo App</h1>
      <p class="muted">A relying party for the IdP — tenant <code>${TENANT}</code>, issuer
      <code>${ISSUER_PUBLIC}</code>.</p>
      <a class="btn" href="/login">Log in with the IdP</a>
      <p class="muted" style="margin-top:1rem">Demo end-user: <code>jdoe</code> / <code>password</code></p>`));
    return;
  }

  if (url.pathname === '/login') {
    const { verifier, challenge } = makePkce();
    const state = b64url(crypto.randomBytes(16));
    sessions.set(state, { verifier });
    const authz = new URL(`${ISSUER_PUBLIC}/authorize`);
    authz.search = new URLSearchParams({
      response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT_URI,
      scope: SCOPE, state, code_challenge: challenge, code_challenge_method: 'S256',
    }).toString();
    res.writeHead(302, { location: authz.toString() });
    res.end();
    return;
  }

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const sess = state && sessions.get(state);
    if (!code || !sess) {
      res.statusCode = 400;
      res.end(page('<h1>Invalid callback</h1><a class="btn" href="/">Back</a>'));
      return;
    }
    sessions.delete(state);

    const tokenRes = await fetch(`${ISSUER}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID, code_verifier: sess.verifier,
      }),
    });
    const tok = await tokenRes.json();
    if (!tok.access_token) {
      res.statusCode = 400;
      res.end(page(`<h1>Token error</h1><pre>${esc(JSON.stringify(tok, null, 2))}</pre>`));
      return;
    }
    const userinfo = await (await fetch(`${ISSUER}/userinfo`, {
      headers: { authorization: `Bearer ${tok.access_token}` },
    })).json();
    const idClaims = JSON.parse(Buffer.from(tok.id_token.split('.')[1], 'base64url'));

    res.end(page(`<h1>Signed in ✓</h1>
      <p class="muted">The IdP authenticated the end-user and issued tokens to this app.</p>
      <h3>UserInfo</h3><pre>${esc(JSON.stringify(userinfo, null, 2))}</pre>
      <h3>ID token claims</h3><pre>${esc(JSON.stringify(idClaims, null, 2))}</pre>
      <h3>Tokens</h3><pre>access_token:  ${tok.access_token.slice(0, 32)}…
id_token:      ${tok.id_token.slice(0, 32)}…
refresh_token: ${tok.refresh_token ? tok.refresh_token.slice(0, 32) + '…' : '(none)'}
expires_in:    ${tok.expires_in}s</pre>
      <a class="btn" href="/login">Log in again</a>`));
    return;
  }

  res.statusCode = 404;
  res.end(page('<h1>404</h1>'));
});

async function ensureClientWithRetry(attempts = 30) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await ensureClient();
      return;
    } catch (err) {
      if (i === attempts) throw err;
      console.log(`waiting for backend at ${API} (${i}/${attempts})…`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

ensureClientWithRetry()
  .then(() => server.listen(PORT, () => {
    console.log(`\nDemo App running → http://localhost:${PORT}`);
    console.log(`Sign in as the end-user:  jdoe / password\n`);
  }))
  .catch((err) => {
    console.error('startup failed:', err.message);
    process.exit(1);
  });
