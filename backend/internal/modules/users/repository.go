package users

import (
	"context"

	"github.com/google/uuid"
)

// Repository is the persistence port for users. List/Get return users with their
// RoleIDs populated. SetRoles replaces a user's role set atomically.
type Repository interface {
	ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]User, error)
	GetByID(ctx context.Context, id uuid.UUID) (User, error)
	GetByUsernameInTenant(ctx context.Context, tenantID uuid.UUID, username string) (User, error)
	Create(ctx context.Context, in CreateInput) (User, error)
	Update(ctx context.Context, id uuid.UUID, in UpdateInput) (User, error)
	Delete(ctx context.Context, id uuid.UUID) error
	SetRoles(ctx context.Context, userID uuid.UUID, roleIDs []uuid.UUID) error
	// Credentials returns the user's id, enabled flag, and bcrypt hash ("" if unset).
	Credentials(ctx context.Context, tenantID uuid.UUID, username string) (id uuid.UUID, enabled bool, passwordHash string, err error)
	SetPassword(ctx context.Context, userID uuid.UUID, passwordHash string) error
}
