// Package tenants is the tenant management module, structured in clean-architecture
// layers: domain (this file) → service (use cases) → repository (port), with a
// sqlc-backed adapter at the edge. Inner layers know nothing about HTTP or SQL.
package tenants

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Tenant is the domain entity.
type Tenant struct {
	ID          uuid.UUID
	Name        string
	DisplayName string
	Enabled     bool
	CreatedAt   time.Time
}

// CreateInput / UpdateInput are use-case inputs (name is immutable after create).
type CreateInput struct {
	Name        string
	DisplayName string
	Enabled     bool
}

type UpdateInput struct {
	DisplayName string
	Enabled     bool
}

// Domain errors — transport maps these to HTTP status + message.
var (
	ErrNotFound     = errors.New("tenant not found")
	ErrNameRequired = errors.New("tenant name is required")
	ErrNameTaken    = errors.New("tenant name already taken")
)
