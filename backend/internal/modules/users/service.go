package users

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo  Repository
	roles RoleChecker
}

func NewService(repo Repository, roles RoleChecker) *Service {
	return &Service{repo: repo, roles: roles}
}

func (s *Service) List(ctx context.Context, tenantID uuid.UUID) ([]User, error) {
	return s.repo.ListByTenant(ctx, tenantID)
}

func (s *Service) Get(ctx context.Context, id uuid.UUID) (User, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Create(ctx context.Context, in CreateInput) (User, error) {
	in.Username = strings.TrimSpace(in.Username)
	if in.Username == "" {
		return User{}, ErrUsernameRequired
	}
	if _, err := s.repo.GetByUsernameInTenant(ctx, in.TenantID, in.Username); err == nil {
		return User{}, ErrUsernameTaken
	} else if !errors.Is(err, ErrNotFound) {
		return User{}, err
	}

	user, err := s.repo.Create(ctx, in)
	if err != nil {
		return User{}, err
	}
	if len(in.RoleIDs) > 0 {
		valid, err := s.roles.FilterTenantRoleIDs(ctx, in.TenantID, in.RoleIDs)
		if err != nil {
			return User{}, err
		}
		if err := s.repo.SetRoles(ctx, user.ID, valid); err != nil {
			return User{}, err
		}
		user.RoleIDs = valid
	}
	return user, nil
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, in UpdateInput) (User, error) {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return User{}, err
	}
	return s.repo.Update(ctx, id, in)
}

// AssignRoles keeps only role ids that exist in the tenant.
func (s *Service) AssignRoles(ctx context.Context, tenantID, userID uuid.UUID, roleIDs []uuid.UUID) (User, error) {
	if _, err := s.repo.GetByID(ctx, userID); err != nil {
		return User{}, err
	}
	valid, err := s.roles.FilterTenantRoleIDs(ctx, tenantID, roleIDs)
	if err != nil {
		return User{}, err
	}
	if err := s.repo.SetRoles(ctx, userID, valid); err != nil {
		return User{}, err
	}
	return s.repo.GetByID(ctx, userID)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

// Authenticate is used by the OIDC login page.
func (s *Service) Authenticate(ctx context.Context, tenantID uuid.UUID, username, password string) (User, error) {
	id, enabled, hash, err := s.repo.Credentials(ctx, tenantID, username)
	if err != nil || !enabled || hash == "" {
		return User{}, ErrInvalidLogin
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return User{}, ErrInvalidLogin
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) SetPassword(ctx context.Context, userID uuid.UUID, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.repo.SetPassword(ctx, userID, string(hash))
}
