package oidc

import (
	"strings"
	"time"

	"github.com/zitadel/oidc/v3/pkg/oidc"
	"github.com/zitadel/oidc/v3/pkg/op"
)

// tokenRecord is what we remember about an issued access/refresh token so that
// userinfo and the refresh grant can be served. Kept in memory for now.
type tokenRecord struct {
	subject  string
	audience []string
	scopes   []string
	authTime time.Time
	expiry   time.Time
}

// refreshTokenRequest implements op.RefreshTokenRequest for the refresh grant.
type refreshTokenRequest struct {
	subject  string
	audience []string
	scopes   []string
	authTime time.Time
	clientID string
}

func (r *refreshTokenRequest) GetAMR() []string            { return []string{"pwd"} }
func (r *refreshTokenRequest) GetAudience() []string       { return r.audience }
func (r *refreshTokenRequest) GetAuthTime() time.Time      { return r.authTime }
func (r *refreshTokenRequest) GetClientID() string         { return r.clientID }
func (r *refreshTokenRequest) GetScopes() []string         { return r.scopes }
func (r *refreshTokenRequest) GetSubject() string          { return r.subject }
func (r *refreshTokenRequest) SetCurrentScopes(s []string) { r.scopes = s }

var _ op.RefreshTokenRequest = (*refreshTokenRequest)(nil)

// setUserClaims fills standard OIDC claims based on the granted scopes.
func setUserClaims(userinfo *oidc.UserInfo, user AuthUser, scopes []string) {
	userinfo.Subject = user.ID.String()
	for _, scope := range scopes {
		switch scope {
		case "profile":
			userinfo.PreferredUsername = user.Username
			userinfo.GivenName = user.FirstName
			userinfo.FamilyName = user.LastName
			userinfo.Name = strings.TrimSpace(user.FirstName + " " + user.LastName)
		case "email":
			userinfo.Email = user.Email
			userinfo.EmailVerified = true
		}
	}
}
