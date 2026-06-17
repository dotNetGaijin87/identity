// Package oidc is the OpenID Connect provider — the tokens this IdP issues to
// client apps (distinct from the admin console's own cookie login). Built on
// github.com/zitadel/oidc so the protocol and crypto are library-handled; we
// supply storage (clients/users/keys) and the hosted login page.
//
// Multi-tenant by issuer path: each tenant has its own issuer
// (e.g. http://host/oidc/acme) and a tenant-scoped provider, built lazily and
// cached. Two tenants can therefore reuse the same client_id.
//
//	5a: per-tenant discovery + JWKS.
//	5b: authorize + hosted login → auth-code (PKCE) issuance.
//	5c: token + userinfo.
package oidc

import (
	"crypto/sha256"
	"net/http"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/zitadel/oidc/v3/pkg/op"
	"golang.org/x/text/language"
)

type Module struct {
	baseURL string
	tenants TenantResolver
	clients ClientStore
	users   UserStore
	signing *signingKey

	mu      sync.Mutex
	engines map[string]http.Handler // tenant name -> composed handler (login + provider)
}

// New builds the OIDC module. baseURL is the externally-visible origin
// (e.g. http://localhost:8080); each tenant's issuer is baseURL + "/oidc/" + name.
func New(baseURL string, tenants TenantResolver, clients ClientStore, users UserStore) (*Module, error) {
	signing, err := newSigningKey("sig-1")
	if err != nil {
		return nil, err
	}
	return &Module{
		baseURL: baseURL,
		tenants: tenants,
		clients: clients,
		users:   users,
		signing: signing,
		engines: make(map[string]http.Handler),
	}, nil
}

// Handler dispatches /oidc/{tenant}/* to the tenant's engine.
func (m *Module) Handler() http.Handler {
	return http.HandlerFunc(m.dispatch)
}

func (m *Module) dispatch(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "tenant")
	ref, found, err := m.tenants.TenantByName(r.Context(), name)
	if err != nil {
		http.Error(w, `{"message":"internal error"}`, http.StatusInternalServerError)
		return
	}
	if !found {
		http.Error(w, `{"message":"unknown tenant"}`, http.StatusNotFound)
		return
	}
	engine, err := m.engineFor(ref)
	if err != nil {
		http.Error(w, `{"message":"internal error"}`, http.StatusInternalServerError)
		return
	}
	// Strip /oidc/{tenant} so the engine sees /login, /.well-known/..., /authorize, etc.
	http.StripPrefix("/oidc/"+name, engine).ServeHTTP(w, r)
}

func (m *Module) engineFor(ref TenantRef) (http.Handler, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if h, ok := m.engines[ref.Name]; ok {
		return h, nil
	}

	issuer := m.baseURL + "/oidc/" + ref.Name
	storage := newStorage(m.signing, ref, issuer, m.clients, m.users)
	provider, err := op.NewProvider(newConfig(), storage, op.StaticIssuer(issuer), op.WithAllowInsecure())
	if err != nil {
		return nil, err
	}

	login := &loginHandler{storage: storage, callbackURL: op.AuthCallbackURL(provider)}

	router := chi.NewRouter()
	router.Get("/login", login.show) // our hosted login page
	router.Post("/login", login.submit)
	// Enforce PKCE in front of the provider's /authorize, then delegate to it.
	router.Get("/authorize", m.authorizeGuard(storage, provider))
	router.Handle("/*", provider) // everything else → the OIDC provider

	m.engines[ref.Name] = router
	return router, nil
}

func newConfig() *op.Config {
	return &op.Config{
		CryptoKey:             sha256.Sum256([]byte("dev-oidc-crypto-key-change-me")),
		CodeMethodS256:        true, // PKCE S256
		AuthMethodPost:        true,
		GrantTypeRefreshToken: true,
		SupportedUILocales:    []language.Tag{language.English},
		SupportedScopes:       []string{"openid", "profile", "email", "roles", "offline_access"},
	}
}
