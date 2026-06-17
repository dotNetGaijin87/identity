package roles

import (
	"context"

	"github.com/google/uuid"
)

// Repository is the persistence port for roles.
type Repository interface {
	ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Role, error)
	GetByID(ctx context.Context, id uuid.UUID) (Role, error)
	GetByNameInTenant(ctx context.Context, tenantID uuid.UUID, name string) (Role, error)
	Create(ctx context.Context, in CreateInput) (Role, error)
	Update(ctx context.Context, id uuid.UUID, in UpdateInput) (Role, error)
	Delete(ctx context.Context, id uuid.UUID) error
	// FilterTenantRoleIDs returns the subset of ids that exist in the tenant.
	FilterTenantRoleIDs(ctx context.Context, tenantID uuid.UUID, ids []uuid.UUID) ([]uuid.UUID, error)
}
