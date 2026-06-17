package users

import (
	"github.com/go-chi/chi/v5"
)

type Module struct {
	svc *Service
}

// New builds the module. The composition root supplies the user Repository and a
// RoleChecker (the roles service) for assignment validation.
func New(repo Repository, roles RoleChecker) *Module {
	return &Module{svc: NewService(repo, roles)}
}

func (m *Module) RegisterRoutes(r chi.Router) {
	r.Get("/tenants/{tenantId}/users", m.handleList)
	r.Post("/tenants/{tenantId}/users", m.handleCreate)
	r.Get("/tenants/{tenantId}/users/{id}", m.handleGet)
	r.Put("/tenants/{tenantId}/users/{id}", m.handleUpdate)
	r.Put("/tenants/{tenantId}/users/{id}/roles", m.handleAssignRoles)
	r.Delete("/tenants/{tenantId}/users/{id}", m.handleDelete)
}

// Service exposes the user service for demo seeding by the composition root.
func (m *Module) Service() *Service { return m.svc }
