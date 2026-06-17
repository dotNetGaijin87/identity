package auth

import (
	"net/http"
	"time"

	"idp/internal/platform/httpx"
)

const sessionCookieName = "idp_session"

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (m *Module) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	admin, token, err := m.svc.Login(r.Context(), req.Username, req.Password)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	m.setSessionCookie(w, token)
	httpx.JSON(w, http.StatusOK, admin) // returns { id, username, email }
}

func (m *Module) handleLogout(w http.ResponseWriter, r *http.Request) {
	m.svc.Logout(r.Context(), readSessionCookie(r))
	m.clearSessionCookie(w)
	httpx.NoContent(w)
}

func (m *Module) handleMe(w http.ResponseWriter, r *http.Request) {
	id, ok := AdminID(r.Context())
	if !ok {
		httpx.Error(w, httpx.Unauthorized("Not authenticated"))
		return
	}
	admin, err := m.svc.AdminByID(r.Context(), id)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, admin)
}

func (m *Module) setSessionCookie(w http.ResponseWriter, raw string) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    raw,
		Path:     "/api",
		HttpOnly: true,
		Secure:   m.secureCookies,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(m.sessionTTL),
		MaxAge:   int(m.sessionTTL.Seconds()),
	})
}

func (m *Module) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/api",
		HttpOnly: true,
		Secure:   m.secureCookies,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}
