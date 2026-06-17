// Package users is the user-management module (tenant-scoped), incl. role
// assignment. Clean-architecture layers: domain → service → repository (port),
// with a sqlc-backed adapter. Role validation goes through the RoleChecker port.
package users

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID
	TenantID  uuid.UUID
	Username  string
	Email     string
	FirstName string
	LastName  string
	Enabled   bool
	CreatedAt time.Time
	RoleIDs   []uuid.UUID
}

type CreateInput struct {
	TenantID  uuid.UUID
	Username  string
	Email     string
	FirstName string
	LastName  string
	Enabled   bool
	RoleIDs   []uuid.UUID
}

type UpdateInput struct {
	Email     string
	FirstName string
	LastName  string
	Enabled   bool
}

var (
	ErrNotFound         = errors.New("user not found")
	ErrUsernameRequired = errors.New("username is required")
	ErrUsernameTaken    = errors.New("username already taken")
	ErrInvalidLogin     = errors.New("invalid username or password")
)

// RoleChecker is the cross-module port: it filters role ids to those that exist
// in the tenant. The roles service satisfies it; the composition root injects it.
type RoleChecker interface {
	FilterTenantRoleIDs(ctx context.Context, tenantID uuid.UUID, ids []uuid.UUID) ([]uuid.UUID, error)
}
