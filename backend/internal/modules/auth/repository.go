package auth

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Repository is the persistence port for admins and sessions. The service depends
// on this interface; postgres.go provides the sqlc-backed adapter. Lookups return
// ErrNotFound when no row matches.
type Repository interface {
	AdminByUsername(ctx context.Context, username string) (Admin, error)
	AdminByID(ctx context.Context, id uuid.UUID) (Admin, error)
	CountAdmins(ctx context.Context) (int64, error)
	CreateAdmin(ctx context.Context, username, email, passwordHash string) (Admin, error)
	CreateSession(ctx context.Context, adminID uuid.UUID, tokenHash string, expiresAt time.Time) error
	SessionByHash(ctx context.Context, tokenHash string) (Session, error)
	DeleteSession(ctx context.Context, tokenHash string) error
}
