package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"idp/internal/platform/httpx"
)

// AdminDTO never includes the password hash.
type AdminDTO struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// Service implements admin authentication with opaque server-side sessions (BFF).
type Service struct {
	repo       Repository
	sessionTTL time.Duration
}

func NewService(repo Repository, sessionTTL time.Duration) *Service {
	return &Service{repo: repo, sessionTTL: sessionTTL}
}

func toDTO(a Admin) AdminDTO {
	return AdminDTO{ID: a.ID.String(), Username: a.Username, Email: a.Email}
}

var (
	errInvalidCredentials = httpx.Unauthorized("Invalid username or password")
	errNotAuthenticated   = httpx.Unauthorized("Not authenticated")
)

// Login returns the raw session token; the handler sets it as an httpOnly cookie.
func (s *Service) Login(ctx context.Context, username, password string) (AdminDTO, string, error) {
	admin, err := s.repo.AdminByUsername(ctx, username)
	if err != nil {
		return AdminDTO{}, "", errInvalidCredentials
	}
	if bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(password)) != nil {
		return AdminDTO{}, "", errInvalidCredentials
	}

	raw, err := randomToken()
	if err != nil {
		return AdminDTO{}, "", err
	}
	if err := s.repo.CreateSession(ctx, admin.ID, hashToken(raw), time.Now().Add(s.sessionTTL)); err != nil {
		return AdminDTO{}, "", err
	}
	return toDTO(admin), raw, nil
}

func (s *Service) ResolveSession(ctx context.Context, raw string) (uuid.UUID, error) {
	if raw == "" {
		return uuid.Nil, errNotAuthenticated
	}
	session, err := s.repo.SessionByHash(ctx, hashToken(raw))
	if err != nil || time.Now().After(session.ExpiresAt) {
		return uuid.Nil, errNotAuthenticated
	}
	return session.AdminID, nil
}

func (s *Service) AdminByID(ctx context.Context, id uuid.UUID) (AdminDTO, error) {
	admin, err := s.repo.AdminByID(ctx, id)
	if err != nil {
		return AdminDTO{}, errNotAuthenticated
	}
	return toDTO(admin), nil
}

// Logout is best-effort.
func (s *Service) Logout(ctx context.Context, raw string) {
	if raw != "" {
		_ = s.repo.DeleteSession(ctx, hashToken(raw))
	}
}

// Bootstrap seeds a default admin/admin in an empty database (dev convenience).
func (s *Service) Bootstrap(ctx context.Context) error {
	n, err := s.repo.CountAdmins(ctx)
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.repo.CreateAdmin(ctx, "admin", "admin@example.com", string(hash))
	return err
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
