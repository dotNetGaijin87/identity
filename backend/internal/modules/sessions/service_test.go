package sessions

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
)

// fakeRepo is an in-memory Repository for DB-free service tests.
type fakeRepo struct {
	byHash  map[string]stored
	revoked map[uuid.UUID]bool
	clients map[uuid.UUID][]string
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		byHash:  map[string]stored{},
		revoked: map[uuid.UUID]bool{},
		clients: map[uuid.UUID][]string{},
	}
}

func (f *fakeRepo) Create(_ context.Context, p CreateParams) (uuid.UUID, error) {
	id := uuid.New()
	f.byHash[p.TokenHash] = stored{ID: id, UserID: p.UserID, ExpiresAt: p.ExpiresAt}
	return id, nil
}

func (f *fakeRepo) ByHash(_ context.Context, tokenHash string) (stored, error) {
	st, ok := f.byHash[tokenHash]
	if !ok {
		return stored{}, ErrNotFound
	}
	st.Revoked = f.revoked[st.ID]
	return st, nil
}

func (f *fakeRepo) Touch(_ context.Context, _ uuid.UUID) error { return nil }

func (f *fakeRepo) UpsertClient(_ context.Context, sessionID uuid.UUID, clientID string) error {
	f.clients[sessionID] = append(f.clients[sessionID], clientID)
	return nil
}

func (f *fakeRepo) Revoke(_ context.Context, _ uuid.UUID, id uuid.UUID) (int64, error) {
	for _, st := range f.byHash {
		if st.ID == id && !f.revoked[id] {
			f.revoked[id] = true
			return 1, nil
		}
	}
	return 0, nil
}

func (f *fakeRepo) ListActiveByTenant(_ context.Context, _ uuid.UUID) ([]Session, error) {
	return nil, nil
}

func TestStartThenResolve(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo, time.Hour)
	userID := uuid.New()

	token, sid, _, err := svc.Start(context.Background(), uuid.New(), userID, "agent", "1.2.3.4")
	if err != nil {
		t.Fatalf("Start: %v", err)
	}

	gotSID, gotUser, ok, err := svc.Resolve(context.Background(), token)
	if err != nil || !ok {
		t.Fatalf("Resolve: ok=%v err=%v", ok, err)
	}
	if gotUser != userID || gotSID != sid {
		t.Fatalf("resolved wrong session: user %v sid %v", gotUser, gotSID)
	}
}

func TestResolveUnknownOrEmpty(t *testing.T) {
	svc := NewService(newFakeRepo(), time.Hour)
	for _, tok := range []string{"", "not-a-real-token"} {
		if _, _, ok, err := svc.Resolve(context.Background(), tok); ok || err != nil {
			t.Fatalf("expected (false,nil) for %q, got ok=%v err=%v", tok, ok, err)
		}
	}
}

func TestResolveExpired(t *testing.T) {
	svc := NewService(newFakeRepo(), -time.Minute) // already expired
	token, _, _, _ := svc.Start(context.Background(), uuid.New(), uuid.New(), "", "")
	if _, _, ok, _ := svc.Resolve(context.Background(), token); ok {
		t.Fatal("expired session should not resolve")
	}
}

func TestResolveRevoked(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo, time.Hour)
	tenantID := uuid.New()
	token, sid, _, _ := svc.Start(context.Background(), tenantID, uuid.New(), "", "")

	if err := svc.Revoke(context.Background(), tenantID, sid); err != nil {
		t.Fatalf("Revoke: %v", err)
	}
	if _, _, ok, _ := svc.Resolve(context.Background(), token); ok {
		t.Fatal("revoked session should not resolve")
	}
}

func TestRevokeMissing(t *testing.T) {
	svc := NewService(newFakeRepo(), time.Hour)
	if err := svc.Revoke(context.Background(), uuid.New(), uuid.New()); err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
