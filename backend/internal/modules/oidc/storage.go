package oidc

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/url"
	"sync"
	"time"

	jose "github.com/go-jose/go-jose/v4"
	"github.com/google/uuid"
	"github.com/zitadel/oidc/v3/pkg/oidc"
	"github.com/zitadel/oidc/v3/pkg/op"
)

// errNotImplemented marks the token / userinfo methods that land in Milestone 5c.
var errNotImplemented = errors.New("oidc: token flow not implemented yet (5c)")
var errAuthRequestNotFound = errors.New("oidc: auth request not found")

// Storage implements op.Storage for a single tenant (issuer). Signing keys are
// shared in-memory; clients/users come from Postgres via ports; auth requests and
// codes are kept in memory for now (persistence is a later refinement).
type Storage struct {
	signing *signingKey
	tenant  TenantRef
	issuer  string
	clients ClientStore
	users   UserStore

	mu            sync.Mutex
	authRequests  map[string]*authRequest // by id
	codes         map[string]string       // auth code -> auth request id
	tokens        map[string]*tokenRecord // access token id -> record
	refreshTokens map[string]*tokenRecord // refresh token -> record
}

func newStorage(sk *signingKey, tenant TenantRef, issuer string, clients ClientStore, users UserStore) *Storage {
	return &Storage{
		signing:       sk,
		tenant:        tenant,
		issuer:        issuer,
		clients:       clients,
		users:         users,
		authRequests:  make(map[string]*authRequest),
		codes:         make(map[string]string),
		tokens:        make(map[string]*tokenRecord),
		refreshTokens: make(map[string]*tokenRecord),
	}
}

var _ op.Storage = (*Storage)(nil)

// ── helpers used by the login handler ──────────────────────────────────────────

func (s *Storage) getAuthRequest(id string) *authRequest {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.authRequests[id]
}

func (s *Storage) markAuthorized(id, subject string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	ar, ok := s.authRequests[id]
	if !ok {
		return false
	}
	ar.subject = subject
	ar.done = true
	return true
}

func randomID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

// ── Keys & discovery ───────────────────────────────────────────────────────────

func (s *Storage) SigningKey(_ context.Context) (op.SigningKey, error) { return s.signing, nil }
func (s *Storage) SignatureAlgorithms(_ context.Context) ([]jose.SignatureAlgorithm, error) {
	return []jose.SignatureAlgorithm{jose.RS256}, nil
}
func (s *Storage) KeySet(_ context.Context) ([]op.Key, error) {
	return []op.Key{&publicKey{signing: s.signing}}, nil
}
func (s *Storage) Health(_ context.Context) error { return nil }

// ── Authorization request flow (5b) ────────────────────────────────────────────

func (s *Storage) CreateAuthRequest(_ context.Context, req *oidc.AuthRequest, _ string) (op.AuthRequest, error) {
	ar := &authRequest{
		id:           randomID(),
		clientID:     req.ClientID,
		redirectURI:  req.RedirectURI,
		scopes:       req.Scopes,
		responseType: req.ResponseType,
		responseMode: req.ResponseMode,
		state:        req.State,
		nonce:        req.Nonce,
		authTime:     time.Now(),
	}
	if req.CodeChallenge != "" {
		ar.codeChallenge = &oidc.CodeChallenge{Challenge: req.CodeChallenge, Method: req.CodeChallengeMethod}
	}
	s.mu.Lock()
	s.authRequests[ar.id] = ar
	s.mu.Unlock()
	return ar, nil
}

func (s *Storage) AuthRequestByID(_ context.Context, id string) (op.AuthRequest, error) {
	if ar := s.getAuthRequest(id); ar != nil {
		return ar, nil
	}
	return nil, errAuthRequestNotFound
}

func (s *Storage) AuthRequestByCode(_ context.Context, code string) (op.AuthRequest, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id, ok := s.codes[code]
	if !ok {
		return nil, errAuthRequestNotFound
	}
	ar, ok := s.authRequests[id]
	if !ok {
		return nil, errAuthRequestNotFound
	}
	return ar, nil
}

func (s *Storage) SaveAuthCode(_ context.Context, id, code string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.authRequests[id]; !ok {
		return errAuthRequestNotFound
	}
	s.codes[code] = id
	return nil
}

func (s *Storage) DeleteAuthRequest(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.authRequests, id)
	for code, rid := range s.codes {
		if rid == id {
			delete(s.codes, code)
		}
	}
	return nil
}

// ── Clients (5b) ───────────────────────────────────────────────────────────────

func (s *Storage) GetClientByClientID(ctx context.Context, clientID string) (op.Client, error) {
	info, found, err := s.clients.ClientByClientID(ctx, s.tenant.ID, clientID)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, fmt.Errorf("client %q not found", clientID)
	}
	loginURL := func(id string) string {
		return s.issuer + "/login?authRequestID=" + url.QueryEscape(id)
	}
	return &opClient{info: info, loginURL: loginURL}, nil
}

func (s *Storage) AuthorizeClientIDSecret(ctx context.Context, clientID, secret string) error {
	info, found, err := s.clients.ClientByClientID(ctx, s.tenant.ID, clientID)
	if err != nil {
		return err
	}
	if !found {
		return fmt.Errorf("invalid client")
	}
	if info.PublicClient {
		return nil
	}
	if info.Secret != secret {
		return fmt.Errorf("invalid client secret")
	}
	return nil
}

// ── Token issuance & refresh (5c) ──────────────────────────────────────────────

const accessTokenTTL = time.Hour

func (s *Storage) CreateAccessToken(_ context.Context, req op.TokenRequest) (string, time.Time, error) {
	expiry := time.Now().Add(accessTokenTTL)
	id := randomID()
	s.mu.Lock()
	s.tokens[id] = &tokenRecord{subject: req.GetSubject(), audience: req.GetAudience(), scopes: req.GetScopes(), expiry: expiry}
	s.mu.Unlock()
	return id, expiry, nil
}

func (s *Storage) CreateAccessAndRefreshTokens(_ context.Context, req op.TokenRequest, currentRefreshToken string) (string, string, time.Time, error) {
	expiry := time.Now().Add(accessTokenTTL)
	tokenID := randomID()
	refreshToken := randomID()
	rec := &tokenRecord{subject: req.GetSubject(), audience: req.GetAudience(), scopes: req.GetScopes(), authTime: time.Now(), expiry: expiry}
	s.mu.Lock()
	s.tokens[tokenID] = rec
	if currentRefreshToken != "" {
		delete(s.refreshTokens, currentRefreshToken) // rotate
	}
	s.refreshTokens[refreshToken] = rec
	s.mu.Unlock()
	return tokenID, refreshToken, expiry, nil
}

func (s *Storage) TokenRequestByRefreshToken(_ context.Context, refreshToken string) (op.RefreshTokenRequest, error) {
	s.mu.Lock()
	rec, ok := s.refreshTokens[refreshToken]
	s.mu.Unlock()
	if !ok {
		return nil, op.ErrInvalidRefreshToken
	}
	clientID := ""
	if len(rec.audience) > 0 {
		clientID = rec.audience[0]
	}
	return &refreshTokenRequest{subject: rec.subject, audience: rec.audience, scopes: rec.scopes, authTime: rec.authTime, clientID: clientID}, nil
}

func (s *Storage) GetRefreshTokenInfo(_ context.Context, _ string, token string) (string, string, error) {
	s.mu.Lock()
	rec, ok := s.refreshTokens[token]
	s.mu.Unlock()
	if !ok {
		return "", "", op.ErrInvalidRefreshToken
	}
	return rec.subject, token, nil
}

func (s *Storage) TerminateSession(context.Context, string, string) error { return nil }

func (s *Storage) RevokeToken(_ context.Context, tokenOrTokenID, _, _ string) *oidc.Error {
	s.mu.Lock()
	delete(s.tokens, tokenOrTokenID)
	delete(s.refreshTokens, tokenOrTokenID)
	s.mu.Unlock()
	return nil
}

// ── Userinfo / claims (5c) ──────────────────────────────────────────────────────

func (s *Storage) SetUserinfoFromToken(ctx context.Context, userinfo *oidc.UserInfo, tokenID, subject, _ string) error {
	s.mu.Lock()
	rec, ok := s.tokens[tokenID]
	s.mu.Unlock()
	scopes := []string{"openid"}
	if ok {
		scopes = rec.scopes
	}
	return s.fillUserinfo(ctx, userinfo, subject, scopes)
}

// SetUserinfoFromScopes populates the userinfo merged into the id_token. op calls
// claims.SetUserInfo with this, so it must at least set the subject (plus any
// non-restricted scope claims) — an empty impl would blank out the id_token's sub.
func (s *Storage) SetUserinfoFromScopes(ctx context.Context, userinfo *oidc.UserInfo, subject, _ string, scopes []string) error {
	return s.fillUserinfo(ctx, userinfo, subject, scopes)
}

func (s *Storage) SetIntrospectionFromToken(ctx context.Context, resp *oidc.IntrospectionResponse, tokenID, subject, _ string) error {
	s.mu.Lock()
	rec, ok := s.tokens[tokenID]
	s.mu.Unlock()
	if !ok {
		return nil // resp.Active stays false
	}
	resp.Active = true
	resp.Scope = rec.scopes
	resp.Subject = subject
	return nil
}

func (s *Storage) GetPrivateClaimsFromScopes(context.Context, string, string, []string) (map[string]any, error) {
	return nil, nil
}

func (s *Storage) GetKeyByIDAndClientID(context.Context, string, string) (*jose.JSONWebKey, error) {
	return nil, errNotImplemented
}

func (s *Storage) ValidateJWTProfileScopes(_ context.Context, _ string, scopes []string) ([]string, error) {
	return scopes, nil
}

func (s *Storage) fillUserinfo(ctx context.Context, userinfo *oidc.UserInfo, subject string, scopes []string) error {
	id, err := uuid.Parse(subject)
	if err != nil {
		return err
	}
	user, found, err := s.users.UserByID(ctx, id)
	if err != nil {
		return err
	}
	if !found {
		return fmt.Errorf("user %q not found", subject)
	}
	setUserClaims(userinfo, user, scopes)
	return nil
}
