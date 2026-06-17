package oidc

import (
	"time"

	"github.com/zitadel/oidc/v3/pkg/oidc"
	"github.com/zitadel/oidc/v3/pkg/op"
)

type opClient struct {
	info     ClientInfo
	loginURL func(id string) string
}

func (c *opClient) GetID() string                        { return c.info.ClientID }
func (c *opClient) RedirectURIs() []string               { return c.info.RedirectURIs }
func (c *opClient) PostLogoutRedirectURIs() []string     { return c.info.PostLogoutURIs }
func (c *opClient) LoginURL(id string) string            { return c.loginURL(id) }
func (c *opClient) AccessTokenType() op.AccessTokenType  { return op.AccessTokenTypeBearer }
func (c *opClient) IDTokenLifetime() time.Duration       { return time.Hour }
func (c *opClient) ClockSkew() time.Duration             { return 0 }
func (c *opClient) IDTokenUserinfoClaimsAssertion() bool { return false }
func (c *opClient) IsScopeAllowed(string) bool           { return true }

// DevMode relaxes redirect-URI checks (allows http/localhost) — fine for this demo.
func (c *opClient) DevMode() bool { return true }

func (c *opClient) ApplicationType() op.ApplicationType {
	if c.info.PublicClient {
		return op.ApplicationTypeUserAgent
	}
	return op.ApplicationTypeWeb
}

func (c *opClient) AuthMethod() oidc.AuthMethod {
	if c.info.PublicClient {
		return oidc.AuthMethodNone
	}
	return oidc.AuthMethodBasic
}

func (c *opClient) ResponseTypes() []oidc.ResponseType {
	return []oidc.ResponseType{oidc.ResponseTypeCode}
}

func (c *opClient) GrantTypes() []oidc.GrantType {
	grants := []oidc.GrantType{oidc.GrantTypeCode, oidc.GrantTypeRefreshToken}
	if c.info.ServiceAccounts {
		grants = append(grants, oidc.GrantTypeClientCredentials)
	}
	if c.info.DeviceFlow {
		grants = append(grants, oidc.GrantTypeDeviceCode)
	}
	return grants
}

func (c *opClient) RestrictAdditionalIdTokenScopes() func(scopes []string) []string {
	return func(scopes []string) []string { return scopes }
}
func (c *opClient) RestrictAdditionalAccessTokenScopes() func(scopes []string) []string {
	return func(scopes []string) []string { return scopes }
}

var _ op.Client = (*opClient)(nil)
