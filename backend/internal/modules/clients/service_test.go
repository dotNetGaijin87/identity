package clients

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

type fakeRepo struct {
	byID       map[uuid.UUID]Client
	byClientID map[string]Client
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{byID: map[uuid.UUID]Client{}, byClientID: map[string]Client{}}
}

func (f *fakeRepo) ListByTenant(context.Context, uuid.UUID) ([]Client, error) { return nil, nil }
func (f *fakeRepo) GetByID(_ context.Context, id uuid.UUID) (Client, error) {
	c, ok := f.byID[id]
	if !ok {
		return Client{}, ErrNotFound
	}
	return c, nil
}
func (f *fakeRepo) GetByClientIDInTenant(_ context.Context, _ uuid.UUID, clientID string) (Client, error) {
	c, ok := f.byClientID[clientID]
	if !ok {
		return Client{}, ErrNotFound
	}
	return c, nil
}
func (f *fakeRepo) Create(_ context.Context, tenantID uuid.UUID, in WriteInput, secret string) (Client, error) {
	c := Client{
		ID: uuid.New(), TenantID: tenantID, ClientID: in.ClientID, Name: in.Name,
		PublicClient: in.PublicClient, Secret: secret, PKCE: in.PKCE,
		IDTokenSignatureAlg: in.IDTokenSignatureAlg, AccessTokenLifespan: in.AccessTokenLifespan,
	}
	f.byID[c.ID] = c
	f.byClientID[c.ClientID] = c
	return c, nil
}
func (f *fakeRepo) Update(_ context.Context, id uuid.UUID, in WriteInput, secret string) (Client, error) {
	c := f.byID[id]
	c.PublicClient, c.Secret = in.PublicClient, secret
	f.byID[id] = c
	return c, nil
}
func (f *fakeRepo) UpdateSecret(_ context.Context, id uuid.UUID, secret string) (Client, error) {
	c := f.byID[id]
	c.Secret = secret
	f.byID[id] = c
	return c, nil
}
func (f *fakeRepo) Delete(context.Context, uuid.UUID) error { return nil }

func TestCreate_SecretAndNormalization(t *testing.T) {
	svc := NewService(newFakeRepo())
	ctx := context.Background()
	tenant := uuid.New()

	if _, err := svc.Create(ctx, tenant, WriteInput{ClientID: ""}); !errors.Is(err, ErrClientIDRequired) {
		t.Fatalf("blank clientId: want ErrClientIDRequired, got %v", err)
	}

	pub, err := svc.Create(ctx, tenant, WriteInput{ClientID: "spa", PublicClient: true, PKCE: "bogus", IDTokenSignatureAlg: "nope", AccessTokenLifespan: 0})
	if err != nil {
		t.Fatal(err)
	}
	if pub.Secret != "" {
		t.Errorf("public client must have no secret, got %q", pub.Secret)
	}
	if pub.PKCE != "none" || pub.IDTokenSignatureAlg != "RS256" || pub.AccessTokenLifespan != 300 {
		t.Errorf("normalization failed: pkce=%q alg=%q ttl=%d", pub.PKCE, pub.IDTokenSignatureAlg, pub.AccessTokenLifespan)
	}

	conf, err := svc.Create(ctx, tenant, WriteInput{ClientID: "svc", PublicClient: false})
	if err != nil {
		t.Fatal(err)
	}
	if conf.Secret == "" {
		t.Error("confidential client should get a generated secret")
	}

	if _, err := svc.Create(ctx, tenant, WriteInput{ClientID: "spa", PublicClient: true}); !errors.Is(err, ErrClientIDTaken) {
		t.Fatalf("duplicate: want ErrClientIDTaken, got %v", err)
	}
}

func TestRegenerateSecret_PublicRejected(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo)
	ctx := context.Background()
	tenant := uuid.New()

	pub, _ := svc.Create(ctx, tenant, WriteInput{ClientID: "spa", PublicClient: true})
	if _, err := svc.RegenerateSecret(ctx, pub.ID); !errors.Is(err, ErrPublicNoSecret) {
		t.Fatalf("public regenerate: want ErrPublicNoSecret, got %v", err)
	}

	conf, _ := svc.Create(ctx, tenant, WriteInput{ClientID: "svc", PublicClient: false})
	old := conf.Secret
	updated, err := svc.RegenerateSecret(ctx, conf.ID)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Secret == "" || updated.Secret == old {
		t.Error("regenerate should produce a new non-empty secret")
	}
}
