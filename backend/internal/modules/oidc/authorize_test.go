package oidc

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestPkceViolation(t *testing.T) {
	pub := ClientInfo{PublicClient: true}
	confS256 := ClientInfo{PublicClient: false, PKCE: "S256"}
	confNone := ClientInfo{PublicClient: false, PKCE: "none"}

	cases := []struct {
		name              string
		info              ClientInfo
		challenge, method string
		wantBad           bool
	}{
		{"public, no challenge", pub, "", "", true},
		{"public, S256 challenge", pub, "abc", "S256", false},
		{"require-pkce client, no challenge", confS256, "", "", true},
		{"non-pkce client, no challenge", confNone, "", "", false},
		{"challenge with plain method", pub, "abc", "plain", true},
	}
	for _, c := range cases {
		if _, bad := pkceViolation(c.info, c.challenge, c.method); bad != c.wantBad {
			t.Errorf("%s: got bad=%v, want %v", c.name, bad, c.wantBad)
		}
	}
}

type fakeClientStore map[string]ClientInfo

func (f fakeClientStore) ClientByClientID(_ context.Context, _ uuid.UUID, clientID string) (ClientInfo, bool, error) {
	info, ok := f[clientID]
	return info, ok, nil
}

func newGuard(clients ClientStore) (http.HandlerFunc, *bool) {
	st := newStorage(nil, TenantRef{ID: uuid.New(), Name: "acme"}, "http://localhost:8080/oidc/acme", clients, nil, nil)
	passed := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		passed = true
		w.WriteHeader(http.StatusOK)
	})
	m := &Module{}
	return m.authorizeGuard(st, next), &passed
}

func TestAuthorizeGuard_RejectsMissingPKCE(t *testing.T) {
	clients := fakeClientStore{"spa": {ClientID: "spa", PublicClient: true, RedirectURIs: []string{"http://localhost:3000/cb"}}}
	guard, passed := newGuard(clients)

	req := httptest.NewRequest(http.MethodGet, "/authorize?client_id=spa&redirect_uri=http://localhost:3000/cb&state=xyz&scope=openid&response_type=code", nil)
	rw := httptest.NewRecorder()
	guard(rw, req)

	if *passed {
		t.Fatal("request without PKCE should NOT pass through to the provider")
	}
	loc := rw.Header().Get("Location")
	if rw.Code != http.StatusFound || !strings.Contains(loc, "error=invalid_request") || !strings.Contains(loc, "state=xyz") {
		t.Fatalf("expected redirect with error+state, got %d %q", rw.Code, loc)
	}
}

func TestAuthorizeGuard_AllowsWithPKCE(t *testing.T) {
	clients := fakeClientStore{"spa": {ClientID: "spa", PublicClient: true, RedirectURIs: []string{"http://localhost:3000/cb"}}}
	guard, passed := newGuard(clients)

	req := httptest.NewRequest(http.MethodGet, "/authorize?client_id=spa&redirect_uri=http://localhost:3000/cb&code_challenge=abc&code_challenge_method=S256&scope=openid&response_type=code", nil)
	guard(httptest.NewRecorder(), req)

	if !*passed {
		t.Fatal("request with PKCE should pass through to the provider")
	}
}

func TestAuthorizeGuard_UnregisteredRedirectIs400(t *testing.T) {
	clients := fakeClientStore{"spa": {ClientID: "spa", PublicClient: true, RedirectURIs: []string{"http://localhost:3000/cb"}}}
	guard, _ := newGuard(clients)

	// Missing PKCE + a redirect_uri that is NOT registered → must not redirect there.
	req := httptest.NewRequest(http.MethodGet, "/authorize?client_id=spa&redirect_uri=http://evil.example.com/x", nil)
	rw := httptest.NewRecorder()
	guard(rw, req)

	if rw.Code != http.StatusBadRequest || rw.Header().Get("Location") != "" {
		t.Fatalf("unregistered redirect must not be used; got %d location=%q", rw.Code, rw.Header().Get("Location"))
	}
}
