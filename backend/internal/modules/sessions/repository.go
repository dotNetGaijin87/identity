package sessions

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type CreateParams struct {
	TenantID  uuid.UUID
	UserID    uuid.UUID
	TokenHash string
	UserAgent string
	IPAddress string
	ExpiresAt time.Time
}

// stored is the minimal session state needed to validate a cookie.
type stored struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	ExpiresAt time.Time
	Revoked   bool
}

type Repository interface {
	Create(ctx context.Context, p CreateParams) (uuid.UUID, error)
	ByHash(ctx context.Context, tokenHash string) (stored, error)
	Touch(ctx context.Context, id uuid.UUID) error
	UpsertClient(ctx context.Context, sessionID uuid.UUID, clientID string) error
	Revoke(ctx context.Context, tenantID, id uuid.UUID) (int64, error)
	ListActiveByTenant(ctx context.Context, tenantID uuid.UUID) ([]Session, error)
}
