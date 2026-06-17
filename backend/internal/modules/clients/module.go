package clients

import (
	"context"

	"github.com/go-chi/chi/v5"
)

type Module struct {
	svc *Service
}

func New(repo Repository) *Module {
	return &Module{svc: NewService(repo)}
}

func (m *Module) RegisterRoutes(r chi.Router) {
	r.Get("/tenants/{tenantId}/clients", m.handleList)
	r.Post("/tenants/{tenantId}/clients", m.handleCreate)
	r.Get("/tenants/{tenantId}/clients/{id}", m.handleGet)
	r.Put("/tenants/{tenantId}/clients/{id}", m.handleUpdate)
	r.Post("/tenants/{tenantId}/clients/{id}/regenerate-secret", m.handleRegenerateSecret)
	r.Delete("/tenants/{tenantId}/clients/{id}", m.handleDelete)
}

func (m *Module) Service() *Service { return m.svc }

// Bootstrap is a no-op kept for symmetry with other modules.
func (m *Module) Bootstrap(_ context.Context) error { return nil }
