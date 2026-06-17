package oidc

import (
	"strings"
	"time"

	"github.com/zitadel/oidc/v3/pkg/oidc"
	"github.com/zitadel/oidc/v3/pkg/op"
)

// tokenRecord backs userinfo and the refresh grant; kept in memory for now.
type tokenRecord struct {
	subject  string
	audience []string
	scopes   []string
	authTime time.Time
	expiry   time.Time
}

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
