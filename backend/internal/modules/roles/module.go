package roles

import (
	"github.com/go-chi/chi/v5"
)

type Module struct {
	svc *Service
}

func New(repo Repository) *Module {
	return &Module{svc: NewService(repo)}
}

func (m *Module) RegisterRoutes(r chi.Router) {
	r.Get("/tenants/{tenantId}/roles", m.handleList)
	r.Post("/tenants/{tenantId}/roles", m.handleCreate)
	r.Get("/tenants/{tenantId}/roles/{id}", m.handleGet)
	r.Put("/tenants/{tenantId}/roles/{id}", m.handleUpdate)
	r.Delete("/tenants/{tenantId}/roles/{id}", m.handleDelete)
}

// Service is wired as the users module's RoleChecker by the composition root.
func (m *Module) Service() *Service { return m.svc }
