package tenants

import (
	"context"

	"github.com/go-chi/chi/v5"
)

// Module is the tenants feature's public surface.
type Module struct {
	svc *Service
}

// New builds the module from a Repository (the composition root supplies the adapter).
func New(repo Repository) *Module {
	return &Module{svc: NewService(repo)}
}

// RegisterRoutes mounts the tenant endpoints on the given router (already /api-scoped
// and, in the composition root, wrapped in the auth middleware).
func (m *Module) RegisterRoutes(r chi.Router) {
	r.Get("/tenants", m.handleList)
	r.Post("/tenants", m.handleCreate)
	r.Get("/tenants/{id}", m.handleGet)
	r.Put("/tenants/{id}", m.handleUpdate)
	r.Delete("/tenants/{id}", m.handleDelete)
}

// Bootstrap seeds demo tenants into an empty store.
func (m *Module) Bootstrap(ctx context.Context) error {
	return m.svc.Bootstrap(ctx)
}

// Service exposes the tenant service for cross-module demo seeding.
func (m *Module) Service() *Service { return m.svc }
