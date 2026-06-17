package clients

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"idp/internal/platform/httpx"
)

type clientResponse struct {
	ID                     string   `json:"id"`
	TenantID               string   `json:"tenantId"`
	ClientID               string   `json:"clientId"`
	Name                   string   `json:"name"`
	Description            string   `json:"description"`
	Enabled                bool     `json:"enabled"`
	PublicClient           bool     `json:"publicClient"`
	Secret                 string   `json:"secret"`
	RootURL                string   `json:"rootUrl"`
	HomeURL                string   `json:"homeUrl"`
	RedirectURIs           []string `json:"redirectUris"`
	PostLogoutRedirectURIs []string `json:"postLogoutRedirectUris"`
	DefaultScopes          []string `json:"defaultScopes"`
	DirectAccessGrants     bool     `json:"directAccessGrants"`
	ServiceAccounts        bool     `json:"serviceAccounts"`
	ImplicitFlow           bool     `json:"implicitFlow"`
	DeviceFlow             bool     `json:"deviceFlow"`
	PKCE                   string   `json:"pkce"`
	ConsentRequired        bool     `json:"consentRequired"`
	AccessTokenLifespan    int      `json:"accessTokenLifespan"`
	IDTokenSignatureAlg    string   `json:"idTokenSignatureAlg"`
	FullScopeAllowed       bool     `json:"fullScopeAllowed"`
	CreatedAt              int64    `json:"createdAt"`
}

func toResponse(c Client) clientResponse {
	secret := c.Secret
	if c.PublicClient {
		secret = "" // public clients never expose a secret
	}
	return clientResponse{
		ID:                     c.ID.String(),
		TenantID:               c.TenantID.String(),
		ClientID:               c.ClientID,
		Name:                   c.Name,
		Description:            c.Description,
		Enabled:                c.Enabled,
		PublicClient:           c.PublicClient,
		Secret:                 secret,
		RootURL:                c.RootURL,
		HomeURL:                c.HomeURL,
		RedirectURIs:           nz(c.RedirectURIs),
		PostLogoutRedirectURIs: nz(c.PostLogoutRedirectURIs),
		DefaultScopes:          nz(c.DefaultScopes),
		DirectAccessGrants:     c.DirectAccessGrants,
		ServiceAccounts:        c.ServiceAccounts,
		ImplicitFlow:           c.ImplicitFlow,
		DeviceFlow:             c.DeviceFlow,
		PKCE:                   c.PKCE,
		ConsentRequired:        c.ConsentRequired,
		AccessTokenLifespan:    c.AccessTokenLifespan,
		IDTokenSignatureAlg:    c.IDTokenSignatureAlg,
		FullScopeAllowed:       c.FullScopeAllowed,
		CreatedAt:              c.CreatedAt.UnixMilli(),
	}
}

type clientRequest struct {
	ClientID               string   `json:"clientId"`
	Name                   string   `json:"name"`
	Description            string   `json:"description"`
	Enabled                bool     `json:"enabled"`
	PublicClient           bool     `json:"publicClient"`
	RootURL                string   `json:"rootUrl"`
	HomeURL                string   `json:"homeUrl"`
	RedirectURIs           []string `json:"redirectUris"`
	PostLogoutRedirectURIs []string `json:"postLogoutRedirectUris"`
	DefaultScopes          []string `json:"defaultScopes"`
	DirectAccessGrants     bool     `json:"directAccessGrants"`
	ServiceAccounts        bool     `json:"serviceAccounts"`
	ImplicitFlow           bool     `json:"implicitFlow"`
	DeviceFlow             bool     `json:"deviceFlow"`
	PKCE                   string   `json:"pkce"`
	ConsentRequired        bool     `json:"consentRequired"`
	AccessTokenLifespan    int      `json:"accessTokenLifespan"`
	IDTokenSignatureAlg    string   `json:"idTokenSignatureAlg"`
	FullScopeAllowed       bool     `json:"fullScopeAllowed"`
}

func (req clientRequest) toWriteInput() WriteInput {
	return WriteInput{
		ClientID:               req.ClientID,
		Name:                   req.Name,
		Description:            req.Description,
		Enabled:                req.Enabled,
		PublicClient:           req.PublicClient,
		RootURL:                req.RootURL,
		HomeURL:                req.HomeURL,
		RedirectURIs:           nz(req.RedirectURIs),
		PostLogoutRedirectURIs: nz(req.PostLogoutRedirectURIs),
		DefaultScopes:          nz(req.DefaultScopes),
		DirectAccessGrants:     req.DirectAccessGrants,
		ServiceAccounts:        req.ServiceAccounts,
		ImplicitFlow:           req.ImplicitFlow,
		DeviceFlow:             req.DeviceFlow,
		PKCE:                   req.PKCE,
		ConsentRequired:        req.ConsentRequired,
		AccessTokenLifespan:    req.AccessTokenLifespan,
		IDTokenSignatureAlg:    req.IDTokenSignatureAlg,
		FullScopeAllowed:       req.FullScopeAllowed,
	}
}

func (m *Module) handleList(w http.ResponseWriter, r *http.Request) {
	tenantID, err := pathUUID(r, "tenantId", "Tenant not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	cs, err := m.svc.List(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	out := make([]clientResponse, len(cs))
	for i, c := range cs {
		out[i] = toResponse(c)
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (m *Module) handleCreate(w http.ResponseWriter, r *http.Request) {
	tenantID, err := pathUUID(r, "tenantId", "Tenant not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	var req clientRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	c, err := m.svc.Create(r.Context(), tenantID, req.toWriteInput())
	if err != nil {
		httpx.Error(w, toHTTP(err, req.ClientID))
		return
	}
	httpx.JSON(w, http.StatusCreated, toResponse(c))
}

func (m *Module) handleGet(w http.ResponseWriter, r *http.Request) {
	id, err := pathUUID(r, "id", "Client not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	c, err := m.svc.Get(r.Context(), id)
	if err != nil {
		httpx.Error(w, toHTTP(err, ""))
		return
	}
	httpx.JSON(w, http.StatusOK, toResponse(c))
}

func (m *Module) handleUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := pathUUID(r, "id", "Client not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	var req clientRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	c, err := m.svc.Update(r.Context(), id, req.toWriteInput())
	if err != nil {
		httpx.Error(w, toHTTP(err, ""))
		return
	}
	httpx.JSON(w, http.StatusOK, toResponse(c))
}

func (m *Module) handleRegenerateSecret(w http.ResponseWriter, r *http.Request) {
	id, err := pathUUID(r, "id", "Client not found")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	c, err := m.svc.RegenerateSecret(r.Context(), id)
	if err != nil {
		httpx.Error(w, toHTTP(err, ""))
		return
	}
	httpx.JSON(w, http.StatusOK, toResponse(c))
}

func (m *Module) handleDelete(w http.ResponseWriter, r *http.Request) {
	id, err := pathUUID(r, "id", "Client not found")
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

func toHTTP(err error, clientID string) error {
	switch {
	case errors.Is(err, ErrNotFound):
		return httpx.NotFound("Client not found")
	case errors.Is(err, ErrClientIDRequired):
		return httpx.BadRequest("Client ID is required")
	case errors.Is(err, ErrClientIDTaken):
		return httpx.Conflict(fmt.Sprintf("A client with ID %q already exists", clientID))
	case errors.Is(err, ErrPublicNoSecret):
		return httpx.BadRequest("Public clients do not have a secret")
	default:
		return err
	}
}
