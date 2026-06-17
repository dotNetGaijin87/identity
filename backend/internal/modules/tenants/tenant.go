// Package tenants is structured in layers: domain → service → repository (port),
// with a sqlc-backed adapter at the edge. Inner layers know nothing about HTTP or SQL.
package tenants

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Tenant struct {
	ID          uuid.UUID
	Name        string
	DisplayName string
	Enabled     bool
	CreatedAt   time.Time
}

// Name is immutable after create, so it is absent from UpdateInput.
type CreateInput struct {
	Name        string
	DisplayName string
	Enabled     bool
}

type UpdateInput struct {
	DisplayName string
	Enabled     bool
}

var (
	ErrNotFound     = errors.New("tenant not found")
	ErrNameRequired = errors.New("tenant name is required")
	ErrNameTaken    = errors.New("tenant name already taken")
)
