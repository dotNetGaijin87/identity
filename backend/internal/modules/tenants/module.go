package tenants

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
	r.Get("/tenants", m.handleList)
	r.Post("/tenants", m.handleCreate)
	r.Get("/tenants/{id}", m.handleGet)
	r.Put("/tenants/{id}", m.handleUpdate)
	r.Delete("/tenants/{id}", m.handleDelete)
}

func (m *Module) Bootstrap(ctx context.Context) error {
	return m.svc.Bootstrap(ctx)
}

func (m *Module) Service() *Service { return m.svc }
