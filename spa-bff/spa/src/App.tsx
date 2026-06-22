import { useEffect, useState } from "react";
import * as api from "./api";
import type { SessionState, TraceEvent, CookieInfo, TokenInfo } from "./types";
import { FlowDiagram } from "./FlowDiagram";
import { Countdown } from "./Countdown";
import { claimEntries, mask } from "./format";

export function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [selected, setSelected] = useState<TraceEvent | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = (s: SessionState) => {
    setSession(s);
    setSelected(s.trace.length ? s.trace[s.trace.length - 1] : null);
  };

  useEffect(() => {
    api.getSession().then(apply).catch(() => undefined);
  }, []);

  const run = async (fn: () => Promise<SessionState>) => {
    setBusy(true);
    try {
      apply(await fn());
    } finally {
      setBusy(false);
    }
  };

  const authed = !!session?.authenticated;
  const trace = session?.trace ?? [];
  const err = new URLSearchParams(window.location.search).get("error");

  const held: string[] = [];
  if (session?.tokens.id) held.push("id");
  if (session?.tokens.access) held.push("access");
  if (session?.tokens.refresh?.present) held.push("refresh");

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          SPA + BFF <span className="sub">— live cookie &amp; token visualizer</span>
        </h1>
        <div className="spacer" />
        <span className={"auth " + (authed ? "on" : "off")}>{authed ? "authenticated" : "anonymous"}</span>
        {!authed ? (
          <button className="primary" onClick={api.login}>
            Log in
          </button>
        ) : (
          <>
            <button onClick={() => run(api.refresh)} disabled={busy}>
              Refresh token
            </button>
            <button onClick={() => run(async () => (await api.userinfo()).session)} disabled={busy}>
              Call UserInfo
            </button>
            <button className="ghost" onClick={() => run(api.logout)} disabled={busy}>
              Log out
            </button>
          </>
        )}
      </header>

      {err && <div className="banner">Login failed: {err}. Try again.</div>}

      {authed && (
        <div className="summary">
          <span className="sb browser">
            🌐 Browser holds: {session?.cookie ? <b>🍪 1 httpOnly cookie</b> : "—"} · <b>0 tokens</b>
          </span>
          <span className="vs">vs</span>
          <span className="sb bff">
            🖥️ BFF holds: <b>{held.length ? `🔑 ${held.join(" · ")}` : "no tokens"}</b>
          </span>
        </div>
      )}

      <div className="layout">
        <section className="stage">
          <FlowDiagram trace={trace} selected={selected?.seq ?? null} onSelect={setSelected} />
          <Inspector ev={selected} />
        </section>
        <aside className="sidebar">
          <CookiePanel cookie={session?.cookie ?? null} />
          <TokenPanel tokens={session?.tokens} />
          <Legend />
        </aside>
      </div>
    </div>
  );
}

function CookiePanel({ cookie }: { cookie: CookieInfo | null }) {
  return (
    <div className="panel">
      <h2>Cookie jar · browser</h2>
      {!cookie ? (
        <div className="placeholder">No session cookie. Log in to have the BFF set one.</div>
      ) : (
        <div className="store-item">
          <div className="who">{cookie.name}</div>
          <code className="value">{cookie.value}</code>
          <div className="attrs">
            {cookie.attributes.httpOnly && <span className="attr danger">HttpOnly</span>}
            <span className="attr">SameSite={cookie.attributes.sameSite}</span>
            <span className="attr">Path={cookie.attributes.path}</span>
            {cookie.attributes.maxAge >= 0 && <span className="attr">Max-Age={cookie.attributes.maxAge}</span>}
          </div>
          <div className="hint">This is all the browser holds. HttpOnly ⇒ invisible to JS / XSS.</div>
        </div>
      )}
    </div>
  );
}

function TokenPanel({ tokens }: { tokens?: SessionState["tokens"] }) {
  const has = tokens && (tokens.id || tokens.access || tokens.refresh);
  return (
    <div className="panel">
      <h2>Token store · BFF (server-side)</h2>
      {!has ? (
        <div className="placeholder">No tokens. They appear here after login — and never leave the server.</div>
      ) : (
        <>
          {tokens?.id && <TokenRow label="id_token" t={tokens.id} />}
          {tokens?.access && <TokenRow label="access_token" t={tokens.access} />}
          {tokens?.refresh?.present && (
            <div className="store-item">
              <div className="who">refresh_token</div>
              <code className="value">{mask(tokens.refresh.value)}</code>
              <div className="hint">Never sent to the browser — the core BFF security win.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TokenRow({ label, t }: { label: string; t: TokenInfo }) {
  const claims = t.payload || null;
  return (
    <div className="store-item">
      <div className="who">
        {label} <span className="tag">{t.type}</span> {label === "access_token" && <Countdown at={t.expiresAt} />}
      </div>
      {claims ? (
        <table className="claims small">
          <tbody>
            {claimEntries(claims).map(([k, v]) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <code className="value">{t.value ? mask(t.value) : "(opaque)"}</code>
      )}
    </div>
  );
}

function Inspector({ ev }: { ev: TraceEvent | null }) {
  if (!ev) return <div className="inspector empty">Click any step above to inspect its full detail.</div>;
  return (
    <div className="inspector">
      <h3>{ev.label}</h3>
      <div className="meta">
        {ev.method && <code className="m">{ev.method}</code>} {ev.url ? shortPath(ev.url) : null}
        {ev.status != null && <> · status {ev.status}</>} · {ev.channel}-channel
      </div>
      {ev.note && <div className="note">{ev.note}</div>}
      {ev.params && <KV obj={ev.params} />}
      {ev.cookie && (
        <pre className="wrap">
          {ev.cookie.name}={ev.cookie.value}; {ev.cookie.attributes.httpOnly ? "HttpOnly; " : ""}SameSite=
          {ev.cookie.attributes.sameSite}; Path={ev.cookie.attributes.path}
          {ev.cookie.attributes.maxAge >= 0 ? `; Max-Age=${ev.cookie.attributes.maxAge}` : ""}
        </pre>
      )}
      {ev.token?.claims && (
        <>
          <div className="sub-h">Decoded claims</div>
          <pre>{JSON.stringify(ev.token.claims, null, 2)}</pre>
        </>
      )}
      {ev.token?.value && (
        <>
          <div className="sub-h">Raw token</div>
          <pre className="wrap">{ev.token.value}</pre>
        </>
      )}
      {ev.body && <pre className="wrap">{ev.body}</pre>}
    </div>
  );
}

function KV({ obj }: { obj: Record<string, unknown> }) {
  return (
    <table className="kv">
      <tbody>
        {Object.entries(obj).map(([k, v]) => (
          <tr key={k}>
            <td>{k}</td>
            <td>{typeof v === "object" ? JSON.stringify(v) : String(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["#60a5fa", "app · SPA ⇄ BFF"],
    ["#8b5cf6", "front-channel · browser ⇄ IdP"],
    ["#2dd4bf", "back-channel · BFF ⇄ IdP"],
    ["#8b93a5", "internal to a party"],
  ];
  return (
    <div className="panel">
      <h2>Channels</h2>
      {items.map(([c, label]) => (
        <div key={label} className="legend-item">
          <span className="swatch" style={{ borderColor: c }} />
          {label}
        </div>
      ))}
    </div>
  );
}

function shortPath(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\/oidc\/[^/]+/, "");
  } catch {
    return url;
  }
}
