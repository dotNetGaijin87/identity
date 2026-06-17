// Package auth is the admin authentication module. The console authenticates with
// an opaque, httpOnly session cookie (BFF pattern) — no tokens in the browser.
// The JWTs this IdP issues to client apps are a separate concern (the oidc module).
package auth

import (
	"context"
	"time"

	"github.com/go-chi/chi/v5"

	"idp/internal/platform/config"
	"idp/internal/platform/middleware"
)

type Module struct {
	svc           *Service
	sessionTTL    time.Duration
	secureCookies bool
}

func New(repo Repository, cfg config.Config) *Module {
	return &Module{
		svc:           NewService(repo, cfg.SessionTTL),
		sessionTTL:    cfg.SessionTTL,
		secureCookies: cfg.Env == "production",
	}
}

func (m *Module) RegisterRoutes(r chi.Router) {
	loginLimit := middleware.RateLimit(10, time.Minute)
	r.Route("/auth", func(r chi.Router) {
		r.With(loginLimit).Post("/login", m.handleLogin)
		r.Post("/logout", m.handleLogout)
		r.With(m.Authenticate).Get("/me", m.handleMe)
	})
}

func (m *Module) Bootstrap(ctx context.Context) error {
	return m.svc.Bootstrap(ctx)
}
