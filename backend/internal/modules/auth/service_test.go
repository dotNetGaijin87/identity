package auth

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type fakeRepo struct {
	admins   map[string]Admin
	byID     map[uuid.UUID]Admin
	sessions map[string]Session
	created  int
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{admins: map[string]Admin{}, byID: map[uuid.UUID]Admin{}, sessions: map[string]Session{}}
}

func (f *fakeRepo) AdminByUsername(_ context.Context, username string) (Admin, error) {
	a, ok := f.admins[username]
	if !ok {
		return Admin{}, ErrNotFound
	}
	return a, nil
}
func (f *fakeRepo) AdminByID(_ context.Context, id uuid.UUID) (Admin, error) {
	a, ok := f.byID[id]
	if !ok {
		return Admin{}, ErrNotFound
	}
	return a, nil
}
func (f *fakeRepo) CountAdmins(context.Context) (int64, error) { return int64(len(f.admins)), nil }
func (f *fakeRepo) CreateAdmin(_ context.Context, username, email, hash string) (Admin, error) {
	a := Admin{ID: uuid.New(), Username: username, Email: email, PasswordHash: hash}
	f.admins[username] = a
	f.byID[a.ID] = a
	f.created++
	return a, nil
}
func (f *fakeRepo) CreateSession(_ context.Context, adminID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	f.sessions[tokenHash] = Session{AdminID: adminID, ExpiresAt: expiresAt}
	return nil
}
func (f *fakeRepo) SessionByHash(_ context.Context, tokenHash string) (Session, error) {
	s, ok := f.sessions[tokenHash]
	if !ok {
		return Session{}, ErrNotFound
	}
	return s, nil
}
func (f *fakeRepo) DeleteSession(_ context.Context, tokenHash string) error {
	delete(f.sessions, tokenHash)
	return nil
}

func seedAdmin(f *fakeRepo) uuid.UUID {
	hash, _ := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
	id := uuid.New()
	a := Admin{ID: id, Username: "admin", Email: "a@e.com", PasswordHash: string(hash)}
	f.admins["admin"] = a
	f.byID[id] = a
	return id
}

func TestLogin_AndResolveSession(t *testing.T) {
	repo := newFakeRepo()
	id := seedAdmin(repo)
	svc := NewService(repo, time.Hour)
	ctx := context.Background()

	if _, _, err := svc.Login(ctx, "admin", "wrong"); err == nil {
		t.Fatal("wrong password should fail")
	}

	dto, raw, err := svc.Login(ctx, "admin", "admin")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if dto.Username != "admin" || raw == "" {
		t.Fatalf("unexpected login result: %+v raw=%q", dto, raw)
	}

	gotID, err := svc.ResolveSession(ctx, raw)
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if gotID != id {
		t.Errorf("resolved admin id = %v, want %v", gotID, id)
	}

	svc.Logout(ctx, raw)
	if _, err := svc.ResolveSession(ctx, raw); err == nil {
		t.Error("session should be gone after logout")
	}
}

func TestBootstrap_SeedsAdminOnce(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo, time.Hour)
	ctx := context.Background()
	if err := svc.Bootstrap(ctx); err != nil {
		t.Fatal(err)
	}
	if err := svc.Bootstrap(ctx); err != nil {
		t.Fatal(err)
	}
	if repo.created != 1 {
		t.Errorf("admin should be seeded exactly once, got %d", repo.created)
	}
}
