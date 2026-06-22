export type Actor = "browser" | "bff" | "idp";
export type Channel = "app" | "front" | "back" | "internal";
export type Group = "login" | "refresh" | "userinfo" | "logout";

export interface CookieInfo {
  name: string;
  value: string;
  attributes: { httpOnly: boolean; sameSite: string; path: string; secure: boolean; maxAge: number };
}

export interface TokenEventInfo {
  kind: "id" | "access" | "refresh";
  type?: string;
  value?: string;
  claims?: Record<string, unknown> | null;
  expiresAt?: number | null;
}

export interface TraceEvent {
  seq: number;
  ts: number;
  kind: "flow-start" | "redirect" | "request" | "response" | "pkce" | "token" | "cookie" | "userinfo" | "logout" | "error";
  channel: Channel;
  group?: Group;
  from: Actor | "spa";
  to: Actor | "spa";
  label: string;
  method?: string;
  url?: string;
  status?: number;
  params?: Record<string, unknown>;
  body?: string;
  note?: string;
  cookie?: CookieInfo;
  token?: TokenEventInfo;
}

export interface TokenInfo {
  present: boolean;
  type?: string;
  value?: string;
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  expiresAt?: number | null;
}

export interface SessionState {
  authenticated: boolean;
  cookie: CookieInfo | null;
  tokens: { id: TokenInfo | null; access: TokenInfo | null; refresh: { present: boolean; value: string } | null };
  user: Record<string, unknown> | null;
  trace: TraceEvent[];
}
