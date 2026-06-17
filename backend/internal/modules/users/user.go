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

// RoleChecker is satisfied by the roles service and injected by the composition root.
type RoleChecker interface {
	FilterTenantRoleIDs(ctx context.Context, tenantID uuid.UUID, ids []uuid.UUID) ([]uuid.UUID, error)
}
