package sessions

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"idp/internal/platform/httpx"
)

type sessionResponse struct {
	ID         string                  `json:"id"`
	UserID     string                  `json:"userId"`
	Username   string                  `json:"username"`
	IPAddress  string                  `json:"ipAddress"`
	UserAgent  string                  `json:"userAgent"`
	CreatedAt  int64                   `json:"createdAt"`
	LastSeenAt int64                   `json:"lastSeenAt"`
	ExpiresAt  int64                   `json:"expiresAt"`
	Clients    []sessionClientResponse `json:"clients"`
}

type sessionClientResponse struct {
	ClientID    string `json:"clientId"`
	ClientName  string `json:"clientName"`
	FirstSeenAt int64  `json:"firstSeenAt"`
	LastSeenAt  int64  `json:"lastSeenAt"`
}

func toResponse(s Session) sessionResponse {
	clients := make([]sessionClientResponse, len(s.Clients))
	for i, c := range s.Clients {
		clients[i] = sessionClientResponse{
			ClientID:    c.ClientID,
			ClientName:  c.ClientName,
			FirstSeenAt: c.FirstSeenAt.UnixMilli(),
			LastSeenAt:  c.LastSeenAt.UnixMilli(),
		}
	}
	return sessionResponse{
		ID:         s.ID.String(),
		UserID:     s.UserID.String(),
		Username:   s.Username,
		IPAddress:  s.IPAddress,
		UserAgent:  s.UserAgent,
		CreatedAt:  s.CreatedAt.UnixMilli(),
		LastSeenAt: s.LastSeenAt.UnixMilli(),
		ExpiresAt:  s.ExpiresAt.UnixMilli(),
		Clients:    clients,
	}
}

func (m *Module) handleList(w http.ResponseWriter, r *http.Request) {
	tenantID, err := pathUUID(r, "tenantId", "Tenant not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	sessions, err := m.svc.List(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	out := make([]sessionResponse, len(sessions))
	for i, s := range sessions {
		out[i] = toResponse(s)
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (m *Module) handleRevoke(w http.ResponseWriter, r *http.Request) {
	tenantID, err := pathUUID(r, "tenantId", "Tenant not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	id, err := pathUUID(r, "id", "Session not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	if err := m.svc.Revoke(r.Context(), tenantID, id); err != nil {
		if errors.Is(err, ErrNotFound) {
			httpx.Error(w, httpx.NotFound("Session not found"))
			return
		}
		httpx.Error(w, err)
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
