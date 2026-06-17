package oidc

import (
	"context"

	"github.com/google/uuid"
)

type TenantRef struct {
	ID   uuid.UUID
	Name string
}

// TenantResolver resolves the tenant in the issuer path (/oidc/{tenant}/...).
type TenantResolver interface {
	TenantByName(ctx context.Context, name string) (ref TenantRef, found bool, err error)
}

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
	PKCE                string // "none" | "S256"
	AccessTokenLifespan int
}

type ClientStore interface {
	ClientByClientID(ctx context.Context, tenantID uuid.UUID, clientID string) (info ClientInfo, found bool, err error)
}

type AuthUser struct {
	ID        uuid.UUID
	Username  string
	Email     string
	FirstName string
	LastName  string
}

type UserStore interface {
	Authenticate(ctx context.Context, tenantID uuid.UUID, username, password string) (user AuthUser, ok bool, err error)
	UserByID(ctx context.Context, id uuid.UUID) (user AuthUser, found bool, err error)
}
