package sessions

import (
	"context"
	"time"

	"github.com/go-chi/chi/v5"
)

type Module struct {
	svc *Service
}

func New(repo Repository, ttl time.Duration) *Module {
	return &Module{svc: NewService(repo, ttl)}
}

func (m *Module) RegisterRoutes(r chi.Router) {
	r.Get("/tenants/{tenantId}/sessions", m.handleList)
	r.Delete("/tenants/{tenantId}/sessions/{id}", m.handleRevoke)
}

func (m *Module) Service() *Service { return m.svc }

// Bootstrap is a no-op kept for symmetry with other modules.
func (m *Module) Bootstrap(_ context.Context) error { return nil }
