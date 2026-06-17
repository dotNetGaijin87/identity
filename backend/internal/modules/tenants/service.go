package tenants

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
)

// Service holds the tenant use cases. It depends on the Repository port only.
type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context) ([]Tenant, error) {
	return s.repo.List(ctx)
}

func (s *Service) Get(ctx context.Context, id uuid.UUID) (Tenant, error) {
	return s.repo.GetByID(ctx, id)
}

// ByName resolves a tenant by its name (used by the OIDC issuer routing).
func (s *Service) ByName(ctx context.Context, name string) (Tenant, error) {
	return s.repo.GetByName(ctx, name)
}

func (s *Service) Create(ctx context.Context, in CreateInput) (Tenant, error) {
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		return Tenant{}, ErrNameRequired
	}
	if _, err := s.repo.GetByName(ctx, in.Name); err == nil {
		return Tenant{}, ErrNameTaken
	} else if !errors.Is(err, ErrNotFound) {
		return Tenant{}, err
	}
	if strings.TrimSpace(in.DisplayName) == "" {
		in.DisplayName = in.Name
	}
	return s.repo.Create(ctx, in)
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, in UpdateInput) (Tenant, error) {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return Tenant{}, err
	}
	return s.repo.Update(ctx, id, in)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

// Bootstrap seeds a couple of demo tenants into an empty store.
func (s *Service) Bootstrap(ctx context.Context) error {
	existing, err := s.repo.List(ctx)
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return nil
	}
	for _, in := range []CreateInput{
		{Name: "system", DisplayName: "System", Enabled: true},
		{Name: "acme", DisplayName: "Acme Corp", Enabled: true},
	} {
		if _, err := s.repo.Create(ctx, in); err != nil {
			return err
		}
	}
	return nil
}
