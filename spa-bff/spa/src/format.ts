// Shared formatting for token values and JWT claims.

export const mask = (v?: string): string => {
  if (!v) return "";
  if (v.length <= 24) return v;
  return `${v.slice(0, 14)}…${v.slice(-8)}  (${v.length} chars)`;
};

const PRIORITY = ["sub", "name", "preferred_username", "email", "email_verified", "aud", "iss", "scope", "azp", "auth_time", "iat", "exp", "nonce"];

// Claims ordered: well-known first (in PRIORITY order), then the rest.
export function claimEntries(claims: Record<string, unknown>): [string, string][] {
  const known = PRIORITY.filter((k) => k in claims);
  const rest = Object.keys(claims).filter((k) => !PRIORITY.includes(k));
  return [...known, ...rest].map((k) => [k, fmtClaim(k, claims[k])]);
}

export function fmtClaim(key: string, v: unknown): string {
  if ((key === "exp" || key === "iat" || key === "auth_time") && typeof v === "number") {
    return `${v}  ·  ${new Date(v * 1000).toLocaleString()}`;
  }
  if (Array.isArray(v)) return v.join(", ");
  if (v && typeof v === "object") return JSON.stringify(v);
  return String(v);
}
