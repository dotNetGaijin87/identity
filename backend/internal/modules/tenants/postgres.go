package tenants

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"idp/internal/platform/database/store"
)

type postgresRepository struct {
	q *store.Queries
}

func NewPostgresRepository(q *store.Queries) Repository {
	return &postgresRepository{q: q}
}

func toDomain(t store.Tenant) Tenant {
	return Tenant{
		ID:          t.ID,
		Name:        t.Name,
		DisplayName: t.DisplayName,
		Enabled:     t.Enabled,
		CreatedAt:   t.CreatedAt,
	}
}

func mapErr(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *postgresRepository) List(ctx context.Context) ([]Tenant, error) {
	rows, err := r.q.ListTenants(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]Tenant, len(rows))
	for i, t := range rows {
		out[i] = toDomain(t)
	}
	return out, nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id uuid.UUID) (Tenant, error) {
	t, err := r.q.GetTenant(ctx, id)
	if err != nil {
		return Tenant{}, mapErr(err)
	}
	return toDomain(t), nil
}

func (r *postgresRepository) GetByName(ctx context.Context, name string) (Tenant, error) {
	t, err := r.q.GetTenantByName(ctx, name)
	if err != nil {
		return Tenant{}, mapErr(err)
	}
	return toDomain(t), nil
}

func (r *postgresRepository) Create(ctx context.Context, in CreateInput) (Tenant, error) {
	t, err := r.q.CreateTenant(ctx, store.CreateTenantParams{
		Name:        in.Name,
		DisplayName: in.DisplayName,
		Enabled:     in.Enabled,
	})
	if err != nil {
		return Tenant{}, err
	}
	return toDomain(t), nil
}

func (r *postgresRepository) Update(ctx context.Context, id uuid.UUID, in UpdateInput) (Tenant, error) {
	t, err := r.q.UpdateTenant(ctx, store.UpdateTenantParams{
		ID:          id,
		DisplayName: in.DisplayName,
		Enabled:     in.Enabled,
	})
	if err != nil {
		return Tenant{}, mapErr(err)
	}
	return toDomain(t), nil
}

func (r *postgresRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.q.DeleteTenant(ctx, id)
}
