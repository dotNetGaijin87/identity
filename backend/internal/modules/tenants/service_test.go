package tenants

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

type fakeRepo struct {
	byID   map[uuid.UUID]Tenant
	byName map[string]Tenant
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{byID: map[uuid.UUID]Tenant{}, byName: map[string]Tenant{}}
}

func (f *fakeRepo) List(context.Context) ([]Tenant, error) {
	out := make([]Tenant, 0, len(f.byID))
	for _, t := range f.byID {
		out = append(out, t)
	}
	return out, nil
}
func (f *fakeRepo) GetByID(_ context.Context, id uuid.UUID) (Tenant, error) {
	t, ok := f.byID[id]
	if !ok {
		return Tenant{}, ErrNotFound
	}
	return t, nil
}
func (f *fakeRepo) GetByName(_ context.Context, name string) (Tenant, error) {
	t, ok := f.byName[name]
	if !ok {
		return Tenant{}, ErrNotFound
	}
	return t, nil
}
func (f *fakeRepo) Create(_ context.Context, in CreateInput) (Tenant, error) {
	t := Tenant{ID: uuid.New(), Name: in.Name, DisplayName: in.DisplayName, Enabled: in.Enabled}
	f.byID[t.ID] = t
	f.byName[t.Name] = t
	return t, nil
}
func (f *fakeRepo) Update(_ context.Context, id uuid.UUID, in UpdateInput) (Tenant, error) {
	t, ok := f.byID[id]
	if !ok {
		return Tenant{}, ErrNotFound
	}
	t.DisplayName, t.Enabled = in.DisplayName, in.Enabled
	f.byID[id] = t
	return t, nil
}
func (f *fakeRepo) Delete(_ context.Context, id uuid.UUID) error {
	delete(f.byID, id)
	return nil
}

func TestCreate_Validation(t *testing.T) {
	svc := NewService(newFakeRepo())
	ctx := context.Background()

	if _, err := svc.Create(ctx, CreateInput{Name: "  "}); !errors.Is(err, ErrNameRequired) {
		t.Fatalf("blank name: want ErrNameRequired, got %v", err)
	}

	tn, err := svc.Create(ctx, CreateInput{Name: "acme", Enabled: true})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if tn.DisplayName != "acme" {
		t.Errorf("displayName should default to name, got %q", tn.DisplayName)
	}

	if _, err := svc.Create(ctx, CreateInput{Name: "acme"}); !errors.Is(err, ErrNameTaken) {
		t.Fatalf("duplicate: want ErrNameTaken, got %v", err)
	}
}

func TestUpdate_NotFound(t *testing.T) {
	svc := NewService(newFakeRepo())
	if _, err := svc.Update(context.Background(), uuid.New(), UpdateInput{}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}
