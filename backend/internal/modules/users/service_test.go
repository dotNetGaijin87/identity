package users

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type fakeRepo struct {
	byID        map[uuid.UUID]User
	byUsername  map[string]User
	roles       map[uuid.UUID][]uuid.UUID
	credEnabled bool
	credHash    string
	credUserID  uuid.UUID
	credErr     error
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{byID: map[uuid.UUID]User{}, byUsername: map[string]User{}, roles: map[uuid.UUID][]uuid.UUID{}}
}

func (f *fakeRepo) ListByTenant(context.Context, uuid.UUID) ([]User, error) { return nil, nil }
func (f *fakeRepo) GetByID(_ context.Context, id uuid.UUID) (User, error) {
	u, ok := f.byID[id]
	if !ok {
		return User{}, ErrNotFound
	}
	u.RoleIDs = f.roles[id]
	return u, nil
}
func (f *fakeRepo) GetByUsernameInTenant(_ context.Context, _ uuid.UUID, username string) (User, error) {
	u, ok := f.byUsername[username]
	if !ok {
		return User{}, ErrNotFound
	}
	return u, nil
}
func (f *fakeRepo) Create(_ context.Context, in CreateInput) (User, error) {
	u := User{ID: uuid.New(), TenantID: in.TenantID, Username: in.Username, Enabled: in.Enabled}
	f.byID[u.ID] = u
	f.byUsername[u.Username] = u
	return u, nil
}
func (f *fakeRepo) Update(_ context.Context, id uuid.UUID, _ UpdateInput) (User, error) {
	return f.byID[id], nil
}
func (f *fakeRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (f *fakeRepo) SetRoles(_ context.Context, userID uuid.UUID, roleIDs []uuid.UUID) error {
	f.roles[userID] = roleIDs
	return nil
}
func (f *fakeRepo) Credentials(context.Context, uuid.UUID, string) (uuid.UUID, bool, string, error) {
	return f.credUserID, f.credEnabled, f.credHash, f.credErr
}
func (f *fakeRepo) SetPassword(context.Context, uuid.UUID, string) error { return nil }

// fakeRoleChecker keeps only ids present in its allow-set (mimics tenant scoping).
type fakeRoleChecker struct{ allow map[uuid.UUID]bool }

func (f fakeRoleChecker) FilterTenantRoleIDs(_ context.Context, _ uuid.UUID, ids []uuid.UUID) ([]uuid.UUID, error) {
	out := []uuid.UUID{}
	for _, id := range ids {
		if f.allow[id] {
			out = append(out, id)
		}
	}
	return out, nil
}

func TestCreate_Validation(t *testing.T) {
	svc := NewService(newFakeRepo(), fakeRoleChecker{})
	ctx := context.Background()
	if _, err := svc.Create(ctx, CreateInput{Username: ""}); !errors.Is(err, ErrUsernameRequired) {
		t.Fatalf("want ErrUsernameRequired, got %v", err)
	}
	if _, err := svc.Create(ctx, CreateInput{Username: "jdoe"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Create(ctx, CreateInput{Username: "jdoe"}); !errors.Is(err, ErrUsernameTaken) {
		t.Fatalf("duplicate: want ErrUsernameTaken, got %v", err)
	}
}

func TestAssignRoles_FiltersInvalid(t *testing.T) {
	repo := newFakeRepo()
	valid, invalid := uuid.New(), uuid.New()
	checker := fakeRoleChecker{allow: map[uuid.UUID]bool{valid: true}}
	svc := NewService(repo, checker)
	ctx := context.Background()

	u, _ := svc.Create(ctx, CreateInput{Username: "jdoe", TenantID: uuid.New()})
	got, err := svc.AssignRoles(ctx, u.TenantID, u.ID, []uuid.UUID{valid, invalid})
	if err != nil {
		t.Fatal(err)
	}
	if len(got.RoleIDs) != 1 || got.RoleIDs[0] != valid {
		t.Fatalf("invalid role id should be filtered out, got %v", got.RoleIDs)
	}
}

func TestAuthenticate(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	id := uuid.New()
	repo := newFakeRepo()
	repo.byID[id] = User{ID: id, Username: "jdoe", Enabled: true}
	repo.credUserID, repo.credEnabled, repo.credHash = id, true, string(hash)
	svc := NewService(repo, fakeRoleChecker{})
	ctx := context.Background()

	if _, err := svc.Authenticate(ctx, uuid.New(), "jdoe", "password"); err != nil {
		t.Fatalf("correct password should succeed, got %v", err)
	}
	if _, err := svc.Authenticate(ctx, uuid.New(), "jdoe", "wrong"); !errors.Is(err, ErrInvalidLogin) {
		t.Fatalf("wrong password: want ErrInvalidLogin, got %v", err)
	}

	repo.credEnabled = false
	if _, err := svc.Authenticate(ctx, uuid.New(), "jdoe", "password"); !errors.Is(err, ErrInvalidLogin) {
		t.Fatalf("disabled user: want ErrInvalidLogin, got %v", err)
	}
}
