package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"idp/internal/platform/database/store"
)

// postgresRepository is the sqlc-backed adapter implementing Repository.
type postgresRepository struct {
	q *store.Queries
}

func NewPostgresRepository(q *store.Queries) Repository {
	return &postgresRepository{q: q}
}

func mapErr(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func adminToDomain(a store.AdminUser) Admin {
	return Admin{ID: a.ID, Username: a.Username, Email: a.Email, PasswordHash: a.PasswordHash}
}

func (r *postgresRepository) AdminByUsername(ctx context.Context, username string) (Admin, error) {
	a, err := r.q.GetAdminByUsername(ctx, username)
	if err != nil {
		return Admin{}, mapErr(err)
	}
	return adminToDomain(a), nil
}

func (r *postgresRepository) AdminByID(ctx context.Context, id uuid.UUID) (Admin, error) {
	a, err := r.q.GetAdminByID(ctx, id)
	if err != nil {
		return Admin{}, mapErr(err)
	}
	return adminToDomain(a), nil
}

func (r *postgresRepository) CountAdmins(ctx context.Context) (int64, error) {
	return r.q.CountAdmins(ctx)
}

func (r *postgresRepository) CreateAdmin(ctx context.Context, username, email, passwordHash string) (Admin, error) {
	a, err := r.q.CreateAdmin(ctx, store.CreateAdminParams{
		Username:     username,
		Email:        email,
		PasswordHash: passwordHash,
	})
	if err != nil {
		return Admin{}, err
	}
	return adminToDomain(a), nil
}

func (r *postgresRepository) CreateSession(ctx context.Context, adminID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := r.q.CreateSession(ctx, store.CreateSessionParams{
		AdminID:   adminID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
	})
	return err
}

func (r *postgresRepository) SessionByHash(ctx context.Context, tokenHash string) (Session, error) {
	s, err := r.q.GetSessionByHash(ctx, tokenHash)
	if err != nil {
		return Session{}, mapErr(err)
	}
	return Session{AdminID: s.AdminID, ExpiresAt: s.ExpiresAt}, nil
}

func (r *postgresRepository) DeleteSession(ctx context.Context, tokenHash string) error {
	return r.q.DeleteSession(ctx, tokenHash)
}
