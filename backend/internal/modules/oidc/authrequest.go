package oidc

import (
	"time"

	"github.com/zitadel/oidc/v3/pkg/oidc"
	"github.com/zitadel/oidc/v3/pkg/op"
)

// authRequest is an in-flight authorization request (op.AuthRequest). It becomes
// "done" once the end-user authenticates on the login page.
type authRequest struct {
	id            string
	clientID      string
	redirectURI   string
	scopes        []string
	responseType  oidc.ResponseType
	responseMode  oidc.ResponseMode
	state         string
	nonce         string
	codeChallenge *oidc.CodeChallenge
	authTime      time.Time
	subject       string // set after login
	done          bool   // set after login
}

func (a *authRequest) GetID() string                         { return a.id }
func (a *authRequest) GetClientID() string                   { return a.clientID }
func (a *authRequest) GetRedirectURI() string                { return a.redirectURI }
func (a *authRequest) GetScopes() []string                   { return a.scopes }
func (a *authRequest) GetResponseType() oidc.ResponseType    { return a.responseType }
func (a *authRequest) GetResponseMode() oidc.ResponseMode    { return a.responseMode }
func (a *authRequest) GetState() string                      { return a.state }
func (a *authRequest) GetNonce() string                      { return a.nonce }
func (a *authRequest) GetCodeChallenge() *oidc.CodeChallenge { return a.codeChallenge }
func (a *authRequest) GetSubject() string                    { return a.subject }
func (a *authRequest) GetAudience() []string                 { return []string{a.clientID} }
func (a *authRequest) GetAuthTime() time.Time                { return a.authTime }
func (a *authRequest) GetACR() string                        { return "" }
func (a *authRequest) GetAMR() []string {
	if a.done {
		return []string{"pwd"}
	}
	return nil
}
func (a *authRequest) Done() bool { return a.done }

var _ op.AuthRequest = (*authRequest)(nil)
