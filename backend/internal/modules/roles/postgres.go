package roles

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

func toDomain(r store.Role) Role {
	return Role{
		ID:          r.ID,
		TenantID:    r.TenantID,
		Name:        r.Name,
		Description: r.Description,
		CreatedAt:   r.CreatedAt,
	}
}

func mapErr(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *postgresRepository) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Role, error) {
	rows, err := r.q.ListRolesByTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	out := make([]Role, len(rows))
	for i, row := range rows {
		out[i] = toDomain(row)
	}
	return out, nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id uuid.UUID) (Role, error) {
	row, err := r.q.GetRole(ctx, id)
	if err != nil {
		return Role{}, mapErr(err)
	}
	return toDomain(row), nil
}

func (r *postgresRepository) GetByNameInTenant(ctx context.Context, tenantID uuid.UUID, name string) (Role, error) {
	row, err := r.q.GetRoleByName(ctx, store.GetRoleByNameParams{TenantID: tenantID, Name: name})
	if err != nil {
		return Role{}, mapErr(err)
	}
	return toDomain(row), nil
}

func (r *postgresRepository) Create(ctx context.Context, in CreateInput) (Role, error) {
	row, err := r.q.CreateRole(ctx, store.CreateRoleParams{
		TenantID:    in.TenantID,
		Name:        in.Name,
		Description: in.Description,
	})
	if err != nil {
		return Role{}, err
	}
	return toDomain(row), nil
}

func (r *postgresRepository) Update(ctx context.Context, id uuid.UUID, in UpdateInput) (Role, error) {
	row, err := r.q.UpdateRole(ctx, store.UpdateRoleParams{
		ID:          id,
		Name:        in.Name,
		Description: in.Description,
	})
	if err != nil {
		return Role{}, mapErr(err)
	}
	return toDomain(row), nil
}

func (r *postgresRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.q.DeleteRole(ctx, id)
}

func (r *postgresRepository) FilterTenantRoleIDs(ctx context.Context, tenantID uuid.UUID, ids []uuid.UUID) ([]uuid.UUID, error) {
	return r.q.FilterTenantRoleIDs(ctx, store.FilterTenantRoleIDsParams{TenantID: tenantID, Ids: ids})
}
