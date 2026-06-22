import { useEffect, useRef, type ReactNode } from "react";
import type { TraceEvent, Actor, CookieInfo, TokenEventInfo } from "./types";
import { claimEntries, mask } from "./format";
import { Countdown } from "./Countdown";

const LANES: { id: Actor; name: string; role: string }[] = [
  { id: "browser", name: "🌐 Browser / SPA", role: "user agent — holds only the cookie" },
  { id: "bff", name: "🖥️ BFF", role: "your server — holds the tokens" },
  { id: "idp", name: "🔐 IdP", role: "acme issuer" },
];
const CH: Record<string, string> = { app: "#60a5fa", front: "#8b5cf6", back: "#2dd4bf", internal: "#8b93a5" };
const GROUP_TITLES: Record<string, string> = {
  login: "Login · Authorization Code + PKCE",
  refresh: "Refresh access token",
  userinfo: "Call UserInfo",
  logout: "Logout",
};
const LANE_W = 240;
const ROW_H = 64;
const MSG_KINDS = ["redirect", "request", "response", "userinfo"];

const laneIndex = (a: string): number => {
  const i = LANES.findIndex((l) => l.id === a || (a === "spa" && l.id === "browser"));
  return i < 0 ? 0 : i;
};
const laneX = (i: number) => LANE_W * (i + 0.5);

export function FlowDiagram({
  trace,
  selected,
  onSelect,
}: {
  trace: TraceEvent[];
  selected: number | null;
  onSelect: (ev: TraceEvent) => void;
}) {
  const W = LANES.length * LANE_W;
  const anchorRef = useRef<HTMLDivElement>(null);

  // On each new batch of events, scroll the start of the latest interaction
  // (its group divider) into view, so an action's full round-trip is visible.
  useEffect(() => {
    anchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [trace.length]);

  // The first event index of the last contiguous group → where to anchor scroll.
  let anchorSeq: number | undefined;
  if (trace.length) {
    let i = trace.length - 1;
    const lg = trace[i].group;
    while (i > 0 && trace[i - 1].group === lg) i--;
    anchorSeq = trace[i].seq;
  }

  let currentGroup: string | undefined;
  let msgNum = 0;
  const items: ReactNode[] = [];
  for (const ev of trace) {
    if (ev.group && ev.group !== currentGroup) {
      currentGroup = ev.group;
      msgNum = 0;
      items.push(
        <div key={`g-${ev.seq}`} ref={ev.seq === anchorSeq ? anchorRef : undefined} className="group-divider">
          <span>{GROUP_TITLES[ev.group] ?? ev.group}</span>
        </div>,
      );
    }
    const isMsg = MSG_KINDS.includes(ev.kind);
    if (isMsg) msgNum += 1;
    items.push(<Row key={ev.seq} ev={ev} n={isMsg ? msgNum : null} W={W} selected={selected === ev.seq} onSelect={onSelect} />);
  }

  return (
    <div className="diagram">
      <div className="lanes-header" style={{ width: W }}>
        {LANES.map((l, i) => (
          <div key={l.id} className="lane-box" style={{ left: laneX(i) }}>
            <div className="lane-name">{l.name}</div>
            <div className="lane-role">{l.role}</div>
          </div>
        ))}
      </div>
      <div className="rows" style={{ width: W }}>
        {trace.length === 0 ? (
          <div className="empty">
            No events yet — press <b>Log in</b> to run the real OIDC flow. Each message, cookie and
            token appears here with its actual values.
          </div>
        ) : (
          items
        )}
      </div>
    </div>
  );
}

function Row({
  ev,
  n,
  W,
  selected,
  onSelect,
}: {
  ev: TraceEvent;
  n: number | null;
  W: number;
  selected: boolean;
  onSelect: (ev: TraceEvent) => void;
}) {
  const from = laneIndex(ev.from);
  const to = laneIndex(ev.to);
  const color = CH[ev.channel] ?? CH.internal;
  const badgeLane = ev.kind === "cookie" ? to : from;
  const cardLane = ev.cookie ? to : laneIndex("bff");
  const cardLeft = Math.max(8, laneX(cardLane) - 140);
  return (
    <div className={"row" + (selected ? " selected" : "")} onClick={() => onSelect(ev)}>
      <svg width={W} height={ROW_H}>
        {LANES.map((_, i) => (
          <line key={i} x1={laneX(i)} y1={0} x2={laneX(i)} y2={ROW_H} stroke="#2a2f3d" strokeWidth={1.2} strokeDasharray="3 4" />
        ))}
        {n !== null ? (
          <Arrow ev={ev} n={n} from={from} to={to} color={color} />
        ) : (
          <Badge label={ev.label} laneAt={badgeLane} color={color} />
        )}
      </svg>
      {(ev.cookie || ev.token) && (
        <div className="card-wrap" style={{ marginLeft: cardLeft }}>
          {ev.cookie && <CookieCard cookie={ev.cookie} />}
          {ev.token && <TokenCard token={ev.token} />}
        </div>
      )}
    </div>
  );
}

function Arrow({ ev, n, from, to, color }: { ev: TraceEvent; n: number; from: number; to: number; color: string }) {
  const x1 = laneX(from);
  const x2 = laneX(to);
  const dir = x2 >= x1 ? 1 : -1;
  const y = 34;
  const mId = `ah-${ev.seq}`;
  return (
    <>
      <defs>
        <marker id={mId} markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill={color} />
        </marker>
      </defs>
      <text x={(x1 + x2) / 2} y={y - 12} textAnchor="middle" fontSize="11.5" fill={color}>
        {ev.label}
      </text>
      <line
        x1={x1 + dir * 15}
        y1={y}
        x2={x2 - dir * 12}
        y2={y}
        stroke={color}
        strokeWidth={1.8}
        strokeDasharray={ev.kind === "redirect" ? "6 4" : undefined}
        markerEnd={`url(#${mId})`}
      />
      <circle cx={x1} cy={y} r={11} fill={color} />
      <text x={x1} y={y + 4} textAnchor="middle" fontSize="11" fontWeight={700} fill="#0d0e13">
        {n}
      </text>
    </>
  );
}

function Badge({ label, laneAt, color }: { label: string; laneAt: number; color: string }) {
  const x = laneX(laneAt);
  const w = Math.min(300, 22 + label.length * 6.6);
  const y = 34;
  return (
    <>
      <rect x={x - w / 2} y={y - 13} width={w} height={26} rx={13} fill="#12141c" stroke={color} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#cdd2de">
        {label}
      </text>
    </>
  );
}

function CookieCard({ cookie }: { cookie: CookieInfo }) {
  const a = cookie.attributes;
  return (
    <div className="valuecard cookie">
      <div className="vc-head">🍪 {cookie.name}</div>
      <code className="vc-value">{cookie.value || "(cleared)"}</code>
      <div className="vc-attrs">
        {a.httpOnly && <span className="attr danger">HttpOnly</span>}
        <span className="attr">SameSite={a.sameSite}</span>
        <span className="attr">Path={a.path}</span>
        <span className="attr">{a.secure ? "Secure" : "not Secure"}</span>
        {a.maxAge >= 0 && <span className="attr">Max-Age={a.maxAge}</span>}
      </div>
      <div className="vc-note">Opaque, HttpOnly → unreadable by JS. No token is ever exposed to the browser.</div>
    </div>
  );
}

function TokenCard({ token }: { token: TokenEventInfo }) {
  const claims = token.claims || null;
  return (
    <div className="valuecard token">
      <div className="vc-head">
        🔑 {token.kind} token {token.type ? <span className="vc-type">· {token.type}</span> : null}{" "}
        {token.kind !== "refresh" && <Countdown at={token.expiresAt} />}
      </div>
      {token.kind === "refresh" ? (
        <code className="vc-value">{mask(token.value)}</code>
      ) : claims ? (
        <table className="claims">
          <tbody>
            {claimEntries(claims)
              .slice(0, 6)
              .map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : (
        <code className="vc-value">{token.value ? mask(token.value) : "(opaque — no readable claims)"}</code>
      )}
      <div className="vc-note">Held server-side on the BFF. Click the row for the full token.</div>
    </div>
  );
}
