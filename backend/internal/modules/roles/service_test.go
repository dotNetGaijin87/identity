package roles

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

type fakeRepo struct {
	byID   map[uuid.UUID]Role
	byName map[string]Role
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{byID: map[uuid.UUID]Role{}, byName: map[string]Role{}}
}

func (f *fakeRepo) ListByTenant(context.Context, uuid.UUID) ([]Role, error) { return nil, nil }
func (f *fakeRepo) GetByID(_ context.Context, id uuid.UUID) (Role, error) {
	r, ok := f.byID[id]
	if !ok {
		return Role{}, ErrNotFound
	}
	return r, nil
}
func (f *fakeRepo) GetByNameInTenant(_ context.Context, _ uuid.UUID, name string) (Role, error) {
	r, ok := f.byName[name]
	if !ok {
		return Role{}, ErrNotFound
	}
	return r, nil
}
func (f *fakeRepo) Create(_ context.Context, in CreateInput) (Role, error) {
	r := Role{ID: uuid.New(), TenantID: in.TenantID, Name: in.Name, Description: in.Description}
	f.byID[r.ID] = r
	f.byName[r.Name] = r
	return r, nil
}
func (f *fakeRepo) Update(_ context.Context, id uuid.UUID, in UpdateInput) (Role, error) {
	r := f.byID[id]
	r.Name, r.Description = in.Name, in.Description
	return r, nil
}
func (f *fakeRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (f *fakeRepo) FilterTenantRoleIDs(_ context.Context, _ uuid.UUID, ids []uuid.UUID) ([]uuid.UUID, error) {
	out := []uuid.UUID{}
	for _, id := range ids {
		if _, ok := f.byID[id]; ok {
			out = append(out, id)
		}
	}
	return out, nil
}

func TestCreate_Validation(t *testing.T) {
	svc := NewService(newFakeRepo())
	ctx := context.Background()
	tenant := uuid.New()

	if _, err := svc.Create(ctx, CreateInput{TenantID: tenant, Name: " "}); !errors.Is(err, ErrNameRequired) {
		t.Fatalf("blank name: want ErrNameRequired, got %v", err)
	}
	if _, err := svc.Create(ctx, CreateInput{TenantID: tenant, Name: "admin"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Create(ctx, CreateInput{TenantID: tenant, Name: "admin"}); !errors.Is(err, ErrNameTaken) {
		t.Fatalf("duplicate: want ErrNameTaken, got %v", err)
	}
}

func TestFilterTenantRoleIDs(t *testing.T) {
	repo := newFakeRepo()
	svc := NewService(repo)
	ctx := context.Background()
	r, _ := svc.Create(ctx, CreateInput{TenantID: uuid.New(), Name: "dev"})
	bogus := uuid.New()

	got, err := svc.FilterTenantRoleIDs(ctx, uuid.New(), []uuid.UUID{r.ID, bogus})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0] != r.ID {
		t.Fatalf("should keep only the real role id, got %v", got)
	}
}
