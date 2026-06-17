package oidc

import (
	"encoding/json"
	"net/http"
	"net/url"
	"slices"
)

// pkceRequired reports whether a client must use PKCE: public clients always, and
// any client explicitly configured with "Require PKCE = S256".
func pkceRequired(info ClientInfo) bool {
	return info.PublicClient || info.PKCE == "S256"
}

// pkceViolation validates the PKCE parameters of an /authorize request against
// the client's policy, returning a description if the request must be rejected.
func pkceViolation(info ClientInfo, challenge, method string) (description string, bad bool) {
	if pkceRequired(info) && challenge == "" {
		return "code_challenge is required for this client (PKCE)", true
	}
	if challenge != "" && method != "" && method != "S256" {
		return "unsupported code_challenge_method; only S256 is allowed", true
	}
	return "", false
}

// authorizeGuard enforces PKCE before delegating to the OIDC provider's /authorize
// handler (which itself does not require PKCE). It only inspects the query string,
// so it never consumes a request body.
func (m *Module) authorizeGuard(storage *Storage, next http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		clientID := q.Get("client_id")
		if clientID != "" {
			info, found, err := storage.clients.ClientByClientID(r.Context(), storage.tenant.ID, clientID)
			if err == nil && found {
				if desc, bad := pkceViolation(info, q.Get("code_challenge"), q.Get("code_challenge_method")); bad {
					writeAuthorizeError(w, r, info, q.Get("redirect_uri"), q.Get("state"), "invalid_request", desc)
					return
				}
			}
		}
		next.ServeHTTP(w, r)
	}
}

// writeAuthorizeError returns an OAuth2 error. Per the spec it redirects to the
// client's redirect_uri only when that URI is registered (avoiding open redirects);
// otherwise it responds directly.
func writeAuthorizeError(w http.ResponseWriter, r *http.Request, info ClientInfo, redirectURI, state, code, desc string) {
	if redirectURI != "" && slices.Contains(info.RedirectURIs, redirectURI) {
		if u, err := url.Parse(redirectURI); err == nil {
			q := u.Query()
			q.Set("error", code)
			q.Set("error_description", desc)
			if state != "" {
				q.Set("state", state)
			}
			u.RawQuery = q.Encode()
			http.Redirect(w, r, u.String(), http.StatusFound)
			return
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": code, "error_description": desc})
}
