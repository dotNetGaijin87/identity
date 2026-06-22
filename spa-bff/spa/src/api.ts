import type { SessionState } from "./types";

// Every call is same-origin to the BFF; the httpOnly session cookie rides along
// automatically. The SPA never holds a token — it only ever talks to /bff/*.
const asJson = (r: Response) => r.json();

export const getSession = (): Promise<SessionState> =>
  fetch("/bff/session", { credentials: "same-origin" }).then(asJson);

export const login = (): void => {
  // Full-page navigation: the OIDC flow needs real redirects through the IdP.
  window.location.href = "/bff/login";
};

export const refresh = (): Promise<SessionState> =>
  fetch("/bff/refresh", { method: "POST", credentials: "same-origin" }).then(asJson);

export const logout = (): Promise<SessionState> =>
  fetch("/bff/logout", { method: "POST", credentials: "same-origin" }).then(asJson);

export const userinfo = (): Promise<{ userinfo: Record<string, unknown>; session: SessionState }> =>
  fetch("/bff/userinfo", { credentials: "same-origin" }).then(asJson);
