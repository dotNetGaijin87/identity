package tenants

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"idp/internal/platform/httpx"
)

// tenantResponse is the API DTO. createdAt is epoch millis to match the frontend.
type tenantResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Enabled     bool   `json:"enabled"`
	CreatedAt   int64  `json:"createdAt"`
}

func toResponse(t Tenant) tenantResponse {
	return tenantResponse{
		ID:          t.ID.String(),
		Name:        t.Name,
		DisplayName: t.DisplayName,
		Enabled:     t.Enabled,
		CreatedAt:   t.CreatedAt.UnixMilli(),
	}
}

type createRequest struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Enabled     bool   `json:"enabled"`
}

type updateRequest struct {
	DisplayName string `json:"displayName"`
	Enabled     bool   `json:"enabled"`
}

func (m *Module) handleList(w http.ResponseWriter, r *http.Request) {
	tenants, err := m.svc.List(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	out := make([]tenantResponse, len(tenants))
	for i, t := range tenants {
		out[i] = toResponse(t)
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (m *Module) handleCreate(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	t, err := m.svc.Create(r.Context(), CreateInput{
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Enabled:     req.Enabled,
	})
	if err != nil {
		httpx.Error(w, toHTTP(err, req.Name))
		return
	}
	httpx.JSON(w, http.StatusCreated, toResponse(t))
}

func (m *Module) handleGet(w http.ResponseWriter, r *http.Request) {
	id, err := tenantID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	t, err := m.svc.Get(r.Context(), id)
	if err != nil {
		httpx.Error(w, toHTTP(err, ""))
		return
	}
	httpx.JSON(w, http.StatusOK, toResponse(t))
}

func (m *Module) handleUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := tenantID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	var req updateRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	t, err := m.svc.Update(r.Context(), id, UpdateInput{DisplayName: req.DisplayName, Enabled: req.Enabled})
	if err != nil {
		httpx.Error(w, toHTTP(err, ""))
		return
	}
	httpx.JSON(w, http.StatusOK, toResponse(t))
}

func (m *Module) handleDelete(w http.ResponseWriter, r *http.Request) {
	id, err := tenantID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	if err := m.svc.Delete(r.Context(), id); err != nil {
		httpx.Error(w, toHTTP(err, ""))
		return
	}
	httpx.NoContent(w)
}

func tenantID(r *http.Request) (uuid.UUID, error) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		return uuid.Nil, httpx.NotFound("Tenant not found")
	}
	return id, nil
}

// toHTTP maps domain errors to the {message} HTTP responses the frontend expects.
func toHTTP(err error, name string) error {
	switch {
	case errors.Is(err, ErrNotFound):
		return httpx.NotFound("Tenant not found")
	case errors.Is(err, ErrNameRequired):
		return httpx.BadRequest("Tenant name is required")
	case errors.Is(err, ErrNameTaken):
		return httpx.Conflict(fmt.Sprintf("A tenant named %q already exists", name))
	default:
		return err
	}
}
