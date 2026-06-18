package oidc

import (
	"context"
	"errors"
	"net/url"

	"github.com/zitadel/oidc/v3/pkg/op"
)

var _ op.ClientCredentialsStorage = (*Storage)(nil)

var errInvalidClientCredentials = errors.New("oidc: invalid client credentials")

type clientCredentialsRequest struct {
	clientID string
	scopes   []string
}

func (r *clientCredentialsRequest) GetSubject() string    { return r.clientID }
func (r *clientCredentialsRequest) GetAudience() []string { return []string{r.clientID} }
func (r *clientCredentialsRequest) GetScopes() []string   { return r.scopes }

func (s *Storage) ClientCredentials(ctx context.Context, clientID, clientSecret string) (op.Client, error) {
	info, found, err := s.clients.ClientByClientID(ctx, s.tenant.ID, clientID)
	if err != nil {
		return nil, err
	}
	if !found || info.PublicClient || info.Secret == "" || info.Secret != clientSecret {
		return nil, errInvalidClientCredentials
	}
	loginURL := func(id string) string {
		return s.issuer + "/login?authRequestID=" + url.QueryEscape(id)
	}
	return &opClient{info: info, loginURL: loginURL}, nil
}

func (s *Storage) ClientCredentialsTokenRequest(_ context.Context, clientID string, scopes []string) (op.TokenRequest, error) {
	return &clientCredentialsRequest{clientID: clientID, scopes: scopes}, nil
}
