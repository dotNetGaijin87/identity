package sessions

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	repo Repository
	ttl  time.Duration
}

func NewService(repo Repository, ttl time.Duration) *Service {
	return &Service{repo: repo, ttl: ttl}
}

// --- OIDC-facing (called via a port from the oidc module) ---

// Start creates a session and returns the raw token (set as an httpOnly cookie),
// the new session id, and its expiry.
func (s *Service) Start(ctx context.Context, tenantID, userID uuid.UUID, userAgent, ip string) (string, uuid.UUID, time.Time, error) {
	raw, err := randomToken()
	if err != nil {
		return "", uuid.Nil, time.Time{}, err
	}
	expiresAt := time.Now().Add(s.ttl)
	id, err := s.repo.Create(ctx, CreateParams{
		TenantID:  tenantID,
		UserID:    userID,
		TokenHash: hashToken(raw),
		UserAgent: userAgent,
		IPAddress: ip,
		ExpiresAt: expiresAt,
	})
	if err != nil {
		return "", uuid.Nil, time.Time{}, err
	}
	return raw, id, expiresAt, nil
}

// Resolve validates a session cookie. ok is false (with nil error) for an
// absent/expired/revoked/unknown session — the caller falls back to the login form.
func (s *Service) Resolve(ctx context.Context, token string) (id, userID uuid.UUID, ok bool, err error) {
	if token == "" {
		return uuid.Nil, uuid.Nil, false, nil
	}
	st, err := s.repo.ByHash(ctx, hashToken(token))
	if err == ErrNotFound {
		return uuid.Nil, uuid.Nil, false, nil
	}
	if err != nil {
		return uuid.Nil, uuid.Nil, false, err
	}
	if st.Revoked || time.Now().After(st.ExpiresAt) {
		return uuid.Nil, uuid.Nil, false, nil
	}
	_ = s.repo.Touch(ctx, st.ID)
	return st.ID, st.UserID, true, nil
}

// RecordClient notes that a session has signed into a client (idempotent).
func (s *Service) RecordClient(ctx context.Context, sessionID uuid.UUID, clientID string) error {
	return s.repo.UpsertClient(ctx, sessionID, clientID)
}

// --- Management-facing ---

func (s *Service) List(ctx context.Context, tenantID uuid.UUID) ([]Session, error) {
	return s.repo.ListActiveByTenant(ctx, tenantID)
}

func (s *Service) Revoke(ctx context.Context, tenantID, id uuid.UUID) error {
	n, err := s.repo.Revoke(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
