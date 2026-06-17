// Package clients manages OAuth/OIDC clients. The service (not the repo) generates
// secrets, and only for confidential clients.
package clients

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Client struct {
	ID                     uuid.UUID
	TenantID               uuid.UUID
	ClientID               string
	Name                   string
	Description            string
	Enabled                bool
	PublicClient           bool
	Secret                 string
	RootURL                string
	HomeURL                string
	RedirectURIs           []string
	PostLogoutRedirectURIs []string
	DefaultScopes          []string
	DirectAccessGrants     bool
	ServiceAccounts        bool
	ImplicitFlow           bool
	DeviceFlow             bool
	PKCE                   string
	ConsentRequired        bool
	AccessTokenLifespan    int
	IDTokenSignatureAlg    string
	FullScopeAllowed       bool
	CreatedAt              time.Time
}

// ClientID applies on create only.
type WriteInput struct {
	ClientID               string
	Name                   string
	Description            string
	Enabled                bool
	PublicClient           bool
	RootURL                string
	HomeURL                string
	RedirectURIs           []string
	PostLogoutRedirectURIs []string
	DefaultScopes          []string
	DirectAccessGrants     bool
	ServiceAccounts        bool
	ImplicitFlow           bool
	DeviceFlow             bool
	PKCE                   string
	ConsentRequired        bool
	AccessTokenLifespan    int
	IDTokenSignatureAlg    string
	FullScopeAllowed       bool
}

var (
	ErrNotFound         = errors.New("client not found")
	ErrClientIDRequired = errors.New("client id is required")
	ErrClientIDTaken    = errors.New("client id already taken")
	ErrPublicNoSecret   = errors.New("public clients have no secret")
)
