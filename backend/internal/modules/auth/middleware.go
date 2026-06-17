package auth

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"idp/internal/platform/httpx"
)

type ctxKey string

const adminIDKey ctxKey = "adminID"

// Authenticate is reused by other modules to protect their routes.
func (m *Module) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := readSessionCookie(r)
		adminID, err := m.svc.ResolveSession(r.Context(), raw)
		if err != nil {
			httpx.Error(w, httpx.Unauthorized("Not authenticated"))
			return
		}
		ctx := context.WithValue(r.Context(), adminIDKey, adminID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func AdminID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(adminIDKey).(uuid.UUID)
	return id, ok
}

func readSessionCookie(r *http.Request) string {
	c, err := r.Cookie(sessionCookieName)
	if err != nil || c == nil {
		return ""
	}
	return c.Value
}
