package roles

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"idp/internal/platform/httpx"
)

type roleResponse struct {
	ID          string `json:"id"`
	TenantID    string `json:"tenantId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CreatedAt   int64  `json:"createdAt"`
}

func toResponse(r Role) roleResponse {
	return roleResponse{
		ID:          r.ID.String(),
		TenantID:    r.TenantID.String(),
		Name:        r.Name,
		Description: r.Description,
		CreatedAt:   r.CreatedAt.UnixMilli(),
	}
}

type writeRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (m *Module) handleList(w http.ResponseWriter, r *http.Request) {
	tenantID, err := pathUUID(r, "tenantId", "Tenant not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	rs, err := m.svc.List(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	out := make([]roleResponse, len(rs))
	for i, role := range rs {
		out[i] = toResponse(role)
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (m *Module) handleCreate(w http.ResponseWriter, r *http.Request) {
	tenantID, err := pathUUID(r, "tenantId", "Tenant not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	var req writeRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	role, err := m.svc.Create(r.Context(), CreateInput{TenantID: tenantID, Name: req.Name, Description: req.Description})
	if err != nil {
		httpx.Error(w, toHTTP(err, req.Name))
		return
	}
	httpx.JSON(w, http.StatusCreated, toResponse(role))
}

func (m *Module) handleGet(w http.ResponseWriter, r *http.Request) {
	id, err := pathUUID(r, "id", "Role not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	role, err := m.svc.Get(r.Context(), id)
	if err != nil {
		httpx.Error(w, toHTTP(err, ""))
		return
	}
	httpx.JSON(w, http.StatusOK, toResponse(role))
}

func (m *Module) handleUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := pathUUID(r, "id", "Role not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	var req writeRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	role, err := m.svc.Update(r.Context(), id, UpdateInput{Name: req.Name, Description: req.Description})
	if err != nil {
		httpx.Error(w, toHTTP(err, req.Name))
		return
	}
	httpx.JSON(w, http.StatusOK, toResponse(role))
}

func (m *Module) handleDelete(w http.ResponseWriter, r *http.Request) {
	id, err := pathUUID(r, "id", "Role not found")
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

func pathUUID(r *http.Request, key, notFoundMsg string) (uuid.UUID, error) {
	id, err := uuid.Parse(chi.URLParam(r, key))
	if err != nil {
		return uuid.Nil, httpx.NotFound(notFoundMsg)
	}
	return id, nil
}

func toHTTP(err error, name string) error {
	switch {
	case errors.Is(err, ErrNotFound):
		return httpx.NotFound("Role not found")
	case errors.Is(err, ErrNameRequired):
		return httpx.BadRequest("Role name is required")
	case errors.Is(err, ErrNameTaken):
		return httpx.Conflict(fmt.Sprintf("A role named %q already exists in this tenant", name))
	default:
		return err
	}
}
