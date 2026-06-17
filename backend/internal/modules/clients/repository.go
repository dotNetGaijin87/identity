package clients

import (
	"context"

	"github.com/google/uuid"
)

// Repository is the persistence port for clients. Create/Update take the secret
// computed by the service (the repo doesn't generate secrets).
type Repository interface {
	ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Client, error)
	GetByID(ctx context.Context, id uuid.UUID) (Client, error)
	GetByClientIDInTenant(ctx context.Context, tenantID uuid.UUID, clientID string) (Client, error)
	Create(ctx context.Context, tenantID uuid.UUID, in WriteInput, secret string) (Client, error)
	Update(ctx context.Context, id uuid.UUID, in WriteInput, secret string) (Client, error)
	UpdateSecret(ctx context.Context, id uuid.UUID, secret string) (Client, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
