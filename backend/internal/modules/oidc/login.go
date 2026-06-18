package oidc

import (
	"context"
	"html/template"
	"net"
	"net/http"
	"strings"
	"time"
)

const ssoCookieName = "idp_sso"

var loginTmpl = template.Must(template.New("login").Parse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in · {{.Tenant}}</title>
<style>
  body{font-family:system-ui,Segoe UI,Roboto,sans-serif;background:#0d0e13;color:#e7e9f0;
    min-height:100vh;display:grid;place-items:center;margin:0}
  .card{background:#15171f;border:1px solid #262a36;border-radius:10px;padding:1.75rem;width:340px;
    box-shadow:0 18px 50px rgba(139,92,246,.12)}
  h1{font-size:1.15rem;margin:0 0 .25rem}.muted{color:#8b93a5;font-size:.85rem;margin:0 0 1.25rem}
  label{display:block;font-size:.85rem;margin:.75rem 0 .3rem}
  input{width:100%;box-sizing:border-box;padding:.5rem .65rem;border-radius:8px;
    border:1px solid #333848;background:#1c1f2a;color:#e7e9f0}
  button{margin-top:1.1rem;width:100%;padding:.55rem;border:0;border-radius:8px;
    background:#8b5cf6;color:#fff;font-weight:600;cursor:pointer}
  .err{color:#f47174;font-size:.85rem;margin-top:.75rem}
  .hint{color:#8b93a5;font-size:.8rem;margin-top:1rem}
  code{background:rgba(139,92,246,.16);color:#b69dff;padding:.05rem .35rem;border-radius:4px}
</style></head><body>
  <form class="card" method="post" action="">
    <h1>Sign in</h1>
    <p class="muted">to continue to <strong>{{.Tenant}}</strong></p>
    <input type="hidden" name="authRequestID" value="{{.ID}}">
    <label for="u">Username</label>
    <input id="u" name="username" autocomplete="username" autofocus>
    <label for="p">Password</label>
    <input id="p" name="password" type="password" autocomplete="current-password">
    {{if .Error}}<div class="err">{{.Error}}</div>{{end}}
    <button type="submit">Sign in</button>
    <p class="hint">Demo user: <code>jdoe</code> / <code>password</code></p>
  </form>
</body></html>`))

type loginHandler struct {
	storage       *Storage
	callbackURL   func(ctx context.Context, requestID string) string
	secureCookies bool
}

func (h *loginHandler) render(w http.ResponseWriter, status int, id, errMsg string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	_ = loginTmpl.Execute(w, map[string]string{
		"ID":     id,
		"Error":  errMsg,
		"Tenant": h.storage.tenant.Name,
	})
}

func (h *loginHandler) show(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("authRequestID")
	// SSO: if a valid session cookie is present, authorize this request without
	// showing the form. The provider sent us here because the auth request isn't
	// yet done; we complete it from the existing session.
	if ar := h.storage.getAuthRequest(id); ar != nil {
		if c, err := r.Cookie(ssoCookieName); err == nil && c.Value != "" {
			sid, userID, ok, err := h.storage.sessions.Resolve(r.Context(), c.Value)
			if err == nil && ok {
				if _, found, _ := h.storage.users.UserByID(r.Context(), userID); found {
					_ = h.storage.sessions.RecordClient(r.Context(), sid, ar.clientID)
					h.storage.markAuthorized(id, userID.String())
					h.finish(w, r, id)
					return
				}
			}
		}
	}
	h.render(w, http.StatusOK, id, "")
}

func (h *loginHandler) submit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	id := r.FormValue("authRequestID")
	ar := h.storage.getAuthRequest(id)
	if ar == nil {
		http.Error(w, "unknown auth request", http.StatusBadRequest)
		return
	}
	user, ok, err := h.storage.users.Authenticate(r.Context(), h.storage.tenant.ID, r.FormValue("username"), r.FormValue("password"))
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if !ok {
		h.render(w, http.StatusUnauthorized, id, "Invalid username or password")
		return
	}

	// Establish an SSO session so subsequent /authorize for other clients skip the
	// form. A session-store failure must not block the login, so it's best-effort.
	if token, sid, expiresAt, err := h.storage.sessions.Start(r.Context(), h.storage.tenant.ID, user.ID, r.UserAgent(), clientIP(r)); err == nil {
		h.setSSOCookie(w, token, expiresAt)
		_ = h.storage.sessions.RecordClient(r.Context(), sid, ar.clientID)
	}

	h.storage.markAuthorized(id, user.ID.String())
	h.finish(w, r, id)
}

// finish redirects back into the provider's authorize flow to mint the code.
// op returns a root-relative callback path, but the provider is mounted under the
// issuer's path (/oidc/{tenant}), so prepend the issuer to keep it routable.
func (h *loginHandler) finish(w http.ResponseWriter, r *http.Request, id string) {
	callback := h.callbackURL(r.Context(), id)
	if !strings.HasPrefix(callback, "http") {
		callback = h.storage.issuer + callback
	}
	http.Redirect(w, r, callback, http.StatusFound)
}

func (h *loginHandler) setSSOCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     ssoCookieName,
		Value:    token,
		Path:     "/oidc/" + h.storage.tenant.Name,
		HttpOnly: true,
		Secure:   h.secureCookies,
		SameSite: http.SameSiteLaxMode,
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
	})
}

// clientIP strips the port from RemoteAddr (set by the RealIP middleware).
func clientIP(r *http.Request) string {
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}
