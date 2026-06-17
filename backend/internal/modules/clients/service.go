package clients

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"

	"github.com/google/uuid"
)

var (
	pkceMethods = map[string]bool{"none": true, "S256": true}
	idAlgs      = map[string]bool{"RS256": true, "ES256": true, "PS256": true}
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, tenantID uuid.UUID) ([]Client, error) {
	return s.repo.ListByTenant(ctx, tenantID)
}

func (s *Service) Get(ctx context.Context, id uuid.UUID) (Client, error) {
	return s.repo.GetByID(ctx, id)
}

// ByClientID is used by the OIDC module.
func (s *Service) ByClientID(ctx context.Context, tenantID uuid.UUID, clientID string) (Client, error) {
	return s.repo.GetByClientIDInTenant(ctx, tenantID, clientID)
}

func (s *Service) Create(ctx context.Context, tenantID uuid.UUID, in WriteInput) (Client, error) {
	in.ClientID = strings.TrimSpace(in.ClientID)
	if in.ClientID == "" {
		return Client{}, ErrClientIDRequired
	}
	if _, err := s.repo.GetByClientIDInTenant(ctx, tenantID, in.ClientID); err == nil {
		return Client{}, ErrClientIDTaken
	} else if !errors.Is(err, ErrNotFound) {
		return Client{}, err
	}
	if strings.TrimSpace(in.Name) == "" {
		in.Name = in.ClientID
	}
	normalize(&in)

	secret := ""
	if !in.PublicClient {
		var err error
		if secret, err = generateSecret(); err != nil {
			return Client{}, err
		}
	}
	return s.repo.Create(ctx, tenantID, in, secret)
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, in WriteInput) (Client, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return Client{}, err
	}
	if strings.TrimSpace(in.Name) == "" {
		in.Name = existing.Name
	}
	normalize(&in)

	// Public clients have no secret; a confidential one gets a secret on first switch.
	secret := existing.Secret
	if in.PublicClient {
		secret = ""
	} else if secret == "" {
		if secret, err = generateSecret(); err != nil {
			return Client{}, err
		}
	}
	return s.repo.Update(ctx, id, in, secret)
}

func (s *Service) RegenerateSecret(ctx context.Context, id uuid.UUID) (Client, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return Client{}, err
	}
	if existing.PublicClient {
		return Client{}, ErrPublicNoSecret
	}
	secret, err := generateSecret()
	if err != nil {
		return Client{}, err
	}
	return s.repo.UpdateSecret(ctx, id, secret)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

// normalize clamps enum/number fields to valid values (defense in depth).
func normalize(in *WriteInput) {
	if !pkceMethods[in.PKCE] {
		in.PKCE = "none"
	}
	if !idAlgs[in.IDTokenSignatureAlg] {
		in.IDTokenSignatureAlg = "RS256"
	}
	if in.AccessTokenLifespan <= 0 {
		in.AccessTokenLifespan = 300
	}
}

func generateSecret() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "cs_" + base64.RawURLEncoding.EncodeToString(b), nil
}
