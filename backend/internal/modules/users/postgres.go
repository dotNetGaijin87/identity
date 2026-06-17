package users

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"idp/internal/platform/database/store"
)

// The pool is kept to run the role-assignment replacement inside a transaction.
type postgresRepository struct {
	pool *pgxpool.Pool
	q    *store.Queries
}

func NewPostgresRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool, q: store.New(pool)}
}

func userToDomain(
	id, tenantID uuid.UUID,
	username, email, firstName, lastName string,
	enabled bool,
	createdAt time.Time,
	roleIDs []uuid.UUID,
) User {
	return User{
		ID:        id,
		TenantID:  tenantID,
		Username:  username,
		Email:     email,
		FirstName: firstName,
		LastName:  lastName,
		Enabled:   enabled,
		CreatedAt: createdAt,
		RoleIDs:   roleIDs,
	}
}

func mapErr(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *postgresRepository) roleIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	ids, err := r.q.ListUserRoleIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	if ids == nil {
		ids = []uuid.UUID{}
	}
	return ids, nil
}

func (r *postgresRepository) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]User, error) {
	rows, err := r.q.ListUsersByTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	pairs, err := r.q.ListTenantUserRoles(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	byUser := make(map[uuid.UUID][]uuid.UUID, len(rows))
	for _, p := range pairs {
		byUser[p.UserID] = append(byUser[p.UserID], p.RoleID)
	}
	out := make([]User, len(rows))
	for i, u := range rows {
		ids := byUser[u.ID]
		if ids == nil {
			ids = []uuid.UUID{}
		}
		out[i] = userToDomain(u.ID, u.TenantID, u.Username, u.Email, u.FirstName, u.LastName, u.Enabled, u.CreatedAt, ids)
	}
	return out, nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id uuid.UUID) (User, error) {
	u, err := r.q.GetUser(ctx, id)
	if err != nil {
		return User{}, mapErr(err)
	}
	ids, err := r.roleIDs(ctx, id)
	if err != nil {
		return User{}, err
	}
	return userToDomain(u.ID, u.TenantID, u.Username, u.Email, u.FirstName, u.LastName, u.Enabled, u.CreatedAt, ids), nil
}

func (r *postgresRepository) GetByUsernameInTenant(ctx context.Context, tenantID uuid.UUID, username string) (User, error) {
	u, err := r.q.GetUserByUsername(ctx, store.GetUserByUsernameParams{TenantID: tenantID, Username: username})
	if err != nil {
		return User{}, mapErr(err)
	}
	return userToDomain(u.ID, u.TenantID, u.Username, u.Email, u.FirstName, u.LastName, u.Enabled, u.CreatedAt, nil), nil
}

func (r *postgresRepository) Create(ctx context.Context, in CreateInput) (User, error) {
	u, err := r.q.CreateUser(ctx, store.CreateUserParams{
		TenantID:  in.TenantID,
		Username:  in.Username,
		Email:     in.Email,
		FirstName: in.FirstName,
		LastName:  in.LastName,
		Enabled:   in.Enabled,
	})
	if err != nil {
		return User{}, err
	}
	return userToDomain(u.ID, u.TenantID, u.Username, u.Email, u.FirstName, u.LastName, u.Enabled, u.CreatedAt, []uuid.UUID{}), nil
}

func (r *postgresRepository) Update(ctx context.Context, id uuid.UUID, in UpdateInput) (User, error) {
	u, err := r.q.UpdateUser(ctx, store.UpdateUserParams{
		ID:        id,
		Email:     in.Email,
		FirstName: in.FirstName,
		LastName:  in.LastName,
		Enabled:   in.Enabled,
	})
	if err != nil {
		return User{}, mapErr(err)
	}
	ids, err := r.roleIDs(ctx, id)
	if err != nil {
		return User{}, err
	}
	return userToDomain(u.ID, u.TenantID, u.Username, u.Email, u.FirstName, u.LastName, u.Enabled, u.CreatedAt, ids), nil
}

func (r *postgresRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.q.DeleteUser(ctx, id)
}

func (r *postgresRepository) Credentials(ctx context.Context, tenantID uuid.UUID, username string) (uuid.UUID, bool, string, error) {
	row, err := r.q.GetUserCredentials(ctx, store.GetUserCredentialsParams{TenantID: tenantID, Username: username})
	if err != nil {
		return uuid.Nil, false, "", mapErr(err)
	}
	hash := ""
	if row.PasswordHash != nil {
		hash = *row.PasswordHash
	}
	return row.ID, row.Enabled, hash, nil
}

func (r *postgresRepository) SetPassword(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	return r.q.SetUserPassword(ctx, store.SetUserPasswordParams{ID: userID, PasswordHash: &passwordHash})
}

func (r *postgresRepository) SetRoles(ctx context.Context, userID uuid.UUID, roleIDs []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // rollback after commit is a no-op
	qtx := r.q.WithTx(tx)
	if err := qtx.DeleteUserRoles(ctx, userID); err != nil {
		return err
	}
	if len(roleIDs) > 0 {
		if err := qtx.AddUserRoles(ctx, store.AddUserRolesParams{UserID: userID, RoleIds: roleIDs}); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
