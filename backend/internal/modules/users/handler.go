package users

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"idp/internal/platform/httpx"
)

type userResponse struct {
	ID        string   `json:"id"`
	TenantID  string   `json:"tenantId"`
	Username  string   `json:"username"`
	Email     string   `json:"email"`
	FirstName string   `json:"firstName"`
	LastName  string   `json:"lastName"`
	Enabled   bool     `json:"enabled"`
	CreatedAt int64    `json:"createdAt"`
	RoleIDs   []string `json:"roleIds"`
}

func toResponse(u User) userResponse {
	roleIDs := make([]string, len(u.RoleIDs))
	for i, id := range u.RoleIDs {
		roleIDs[i] = id.String()
	}
	return userResponse{
		ID:        u.ID.String(),
		TenantID:  u.TenantID.String(),
		Username:  u.Username,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Enabled:   u.Enabled,
		CreatedAt: u.CreatedAt.UnixMilli(),
		RoleIDs:   roleIDs,
	}
}

type createRequest struct {
	Username  string   `json:"username"`
	Email     string   `json:"email"`
	FirstName string   `json:"firstName"`
	LastName  string   `json:"lastName"`
	Enabled   bool     `json:"enabled"`
	RoleIDs   []string `json:"roleIds"`
}

type updateRequest struct {
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Enabled   bool   `json:"enabled"`
}

type assignRolesRequest struct {
	RoleIDs []string `json:"roleIds"`
}

func (m *Module) handleList(w http.ResponseWriter, r *http.Request) {
	tenantID, err := pathUUID(r, "tenantId", "Tenant not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	us, err := m.svc.List(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	out := make([]userResponse, len(us))
	for i, u := range us {
		out[i] = toResponse(u)
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (m *Module) handleCreate(w http.ResponseWriter, r *http.Request) {
	tenantID, err := pathUUID(r, "tenantId", "Tenant not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	var req createRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	user, err := m.svc.Create(r.Context(), CreateInput{
		TenantID:  tenantID,
		Username:  req.Username,
		Email:     req.Email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Enabled:   req.Enabled,
		RoleIDs:   parseUUIDs(req.RoleIDs),
	})
	if err != nil {
		httpx.Error(w, toHTTP(err, req.Username))
		return
	}
	httpx.JSON(w, http.StatusCreated, toResponse(user))
}

func (m *Module) handleGet(w http.ResponseWriter, r *http.Request) {
	id, err := pathUUID(r, "id", "User not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	user, err := m.svc.Get(r.Context(), id)
	if err != nil {
		httpx.Error(w, toHTTP(err, ""))
		return
	}
	httpx.JSON(w, http.StatusOK, toResponse(user))
}

func (m *Module) handleUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := pathUUID(r, "id", "User not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	var req updateRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	user, err := m.svc.Update(r.Context(), id, UpdateInput{
		Email:     req.Email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Enabled:   req.Enabled,
	})
	if err != nil {
		httpx.Error(w, toHTTP(err, ""))
		return
	}
	httpx.JSON(w, http.StatusOK, toResponse(user))
}

func (m *Module) handleAssignRoles(w http.ResponseWriter, r *http.Request) {
	tenantID, err := pathUUID(r, "tenantId", "Tenant not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	id, err := pathUUID(r, "id", "User not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	var req assignRolesRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	user, err := m.svc.AssignRoles(r.Context(), tenantID, id, parseUUIDs(req.RoleIDs))
	if err != nil {
		httpx.Error(w, toHTTP(err, ""))
		return
	}
	httpx.JSON(w, http.StatusOK, toResponse(user))
}

func (m *Module) handleDelete(w http.ResponseWriter, r *http.Request) {
	id, err := pathUUID(r, "id", "User not found")
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

// parseUUIDs converts string ids to UUIDs, silently dropping malformed ones
// (invalid/unknown role ids are filtered against the tenant by the service).
func parseUUIDs(ss []string) []uuid.UUID {
	out := make([]uuid.UUID, 0, len(ss))
	for _, s := range ss {
		if id, err := uuid.Parse(s); err == nil {
			out = append(out, id)
		}
	}
	return out
}

func toHTTP(err error, username string) error {
	switch {
	case errors.Is(err, ErrNotFound):
		return httpx.NotFound("User not found")
	case errors.Is(err, ErrUsernameRequired):
		return httpx.BadRequest("Username is required")
	case errors.Is(err, ErrUsernameTaken):
		return httpx.Conflict(fmt.Sprintf("A user named %q already exists", username))
	default:
		return err
	}
}
