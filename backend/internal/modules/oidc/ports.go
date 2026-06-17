package oidc

import (
	"context"

	"github.com/google/uuid"
)

// TenantRef is the minimal tenant identity the OIDC module needs.
type TenantRef struct {
	ID   uuid.UUID
	Name string
}

// TenantResolver resolves the tenant in the issuer path (/oidc/{tenant}/...).
// The composition root supplies an adapter over the tenants service.
type TenantResolver interface {
	TenantByName(ctx context.Context, name string) (ref TenantRef, found bool, err error)
}

// ClientInfo is the subset of a client the OIDC provider needs.
type ClientInfo struct {
	ClientID            string
	PublicClient        bool
	Secret              string
	RedirectURIs        []string
	PostLogoutURIs      []string
	DefaultScopes       []string
	DirectAccessGrants  bool
	ServiceAccounts     bool
	DeviceFlow          bool
	AccessTokenLifespan int
}

// ClientStore looks up a client by its OAuth client_id within a tenant.
// Returns found=false when no such client exists.
type ClientStore interface {
	ClientByClientID(ctx context.Context, tenantID uuid.UUID, clientID string) (info ClientInfo, found bool, err error)
}

// AuthUser is the end-user identity used to build tokens/userinfo.
type AuthUser struct {
	ID        uuid.UUID
	Username  string
	Email     string
	FirstName string
	LastName  string
}

// UserStore authenticates end-users and loads them by id (tenant-scoped).
type UserStore interface {
	Authenticate(ctx context.Context, tenantID uuid.UUID, username, password string) (user AuthUser, ok bool, err error)
	UserByID(ctx context.Context, id uuid.UUID) (user AuthUser, found bool, err error)
}
