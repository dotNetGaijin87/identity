package tenants

import (
	"context"

	"github.com/google/uuid"
)

// GetByID and GetByName return ErrNotFound when no row matches.
type Repository interface {
	List(ctx context.Context) ([]Tenant, error)
	GetByID(ctx context.Context, id uuid.UUID) (Tenant, error)
	GetByName(ctx context.Context, name string) (Tenant, error)
	Create(ctx context.Context, in CreateInput) (Tenant, error)
	Update(ctx context.Context, id uuid.UUID, in UpdateInput) (Tenant, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
