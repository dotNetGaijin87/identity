package sessions

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

func (r *postgresRepository) Create(ctx context.Context, p CreateParams) (uuid.UUID, error) {
	row, err := r.q.CreateUserSession(ctx, store.CreateUserSessionParams{
		TenantID:  p.TenantID,
		UserID:    p.UserID,
		TokenHash: p.TokenHash,
		UserAgent: p.UserAgent,
		IpAddress: p.IPAddress,
		ExpiresAt: p.ExpiresAt,
	})
	if err != nil {
		return uuid.Nil, err
	}
	return row.ID, nil
}

func (r *postgresRepository) ByHash(ctx context.Context, tokenHash string) (stored, error) {
	row, err := r.q.GetUserSessionByHash(ctx, tokenHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return stored{}, ErrNotFound
	}
	if err != nil {
		return stored{}, err
	}
	return stored{
		ID:        row.ID,
		UserID:    row.UserID,
		ExpiresAt: row.ExpiresAt,
		Revoked:   row.RevokedAt.Valid,
	}, nil
}

func (r *postgresRepository) Touch(ctx context.Context, id uuid.UUID) error {
	return r.q.TouchUserSession(ctx, id)
}

func (r *postgresRepository) UpsertClient(ctx context.Context, sessionID uuid.UUID, clientID string) error {
	return r.q.UpsertSessionClient(ctx, store.UpsertSessionClientParams{SessionID: sessionID, ClientID: clientID})
}

func (r *postgresRepository) Revoke(ctx context.Context, tenantID, id uuid.UUID) (int64, error) {
	return r.q.RevokeUserSession(ctx, store.RevokeUserSessionParams{ID: id, TenantID: tenantID})
}

func (r *postgresRepository) ListActiveByTenant(ctx context.Context, tenantID uuid.UUID) ([]Session, error) {
	rows, err := r.q.ListActiveSessionsByTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	clientRows, err := r.q.ListActiveSessionClientsByTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	out := make([]Session, len(rows))
	byID := make(map[uuid.UUID]*Session, len(rows))
	for i, s := range rows {
		out[i] = Session{
			ID:         s.ID,
			UserID:     s.UserID,
			Username:   s.Username,
			UserAgent:  s.UserAgent,
			IPAddress:  s.IpAddress,
			CreatedAt:  s.CreatedAt,
			LastSeenAt: s.LastSeenAt,
			ExpiresAt:  s.ExpiresAt,
		}
		byID[s.ID] = &out[i]
	}
	for _, c := range clientRows {
		if sess := byID[c.SessionID]; sess != nil {
			sess.Clients = append(sess.Clients, SessionClient{
				ClientID:    c.ClientID,
				ClientName:  c.ClientName,
				FirstSeenAt: c.FirstSeenAt,
				LastSeenAt:  c.LastSeenAt,
			})
		}
	}
	return out, nil
}
