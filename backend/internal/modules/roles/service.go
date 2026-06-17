package roles

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, tenantID uuid.UUID) ([]Role, error) {
	return s.repo.ListByTenant(ctx, tenantID)
}

func (s *Service) Get(ctx context.Context, id uuid.UUID) (Role, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Create(ctx context.Context, in CreateInput) (Role, error) {
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		return Role{}, ErrNameRequired
	}
	if _, err := s.repo.GetByNameInTenant(ctx, in.TenantID, in.Name); err == nil {
		return Role{}, ErrNameTaken
	} else if !errors.Is(err, ErrNotFound) {
		return Role{}, err
	}
	return s.repo.Create(ctx, in)
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, in UpdateInput) (Role, error) {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return Role{}, err
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		return Role{}, ErrNameRequired
	}
	return s.repo.Update(ctx, id, in)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

// FilterTenantRoleIDs satisfies the users module's RoleChecker port.
func (s *Service) FilterTenantRoleIDs(ctx context.Context, tenantID uuid.UUID, ids []uuid.UUID) ([]uuid.UUID, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	return s.repo.FilterTenantRoleIDs(ctx, tenantID, ids)
}
