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
	baseURL       string
	tenants       TenantResolver
	clients       ClientStore
	users         UserStore
	sessions      SessionStore
	signing       *signingKey
	secureCookies bool

	mu      sync.Mutex
	engines map[string]http.Handler // tenant name -> composed handler (login + provider)
}

// Each tenant's issuer is baseURL + "/oidc/" + name.
func New(baseURL string, tenants TenantResolver, clients ClientStore, users UserStore, sessions SessionStore, secureCookies bool) (*Module, error) {
	signing, err := newSigningKey("sig-1")
	if err != nil {
		return nil, err
	}
	return &Module{
		baseURL:       baseURL,
		tenants:       tenants,
		clients:       clients,
		users:         users,
		sessions:      sessions,
		signing:       signing,
		secureCookies: secureCookies,
		engines:       make(map[string]http.Handler),
	}, nil
}

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
	storage := newStorage(m.signing, ref, issuer, m.clients, m.users, m.sessions)
	provider, err := op.NewProvider(newConfig(), storage, op.StaticIssuer(issuer), op.WithAllowInsecure())
	if err != nil {
		return nil, err
	}

	login := &loginHandler{storage: storage, callbackURL: op.AuthCallbackURL(provider), secureCookies: m.secureCookies}

	router := chi.NewRouter()
	router.Get("/login", login.show)
	router.Post("/login", login.submit)
	// Enforce PKCE in front of the provider's /authorize, then delegate to it.
	router.Get("/authorize", m.authorizeGuard(storage, provider))
	router.Handle("/*", provider)

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
