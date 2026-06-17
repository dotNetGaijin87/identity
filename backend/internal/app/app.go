// Package app is the composition root: it builds each module's adapter →
// service → transport, injects cross-module dependencies as interfaces, and
// mounts every module under /api (admin routes behind the auth middleware).
package app

import (
	"context"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"idp/internal/modules/auth"
	"idp/internal/modules/clients"
	"idp/internal/modules/oidc"
	"idp/internal/modules/roles"
	"idp/internal/modules/tenants"
	"idp/internal/modules/users"
	"idp/internal/platform/config"
	"idp/internal/platform/database/store"
	"idp/internal/platform/httpx"
	"idp/internal/platform/middleware"
)

// App is the assembled application: an HTTP handler plus a bootstrap hook.
type App struct {
	Handler http.Handler
	auth    *auth.Module
	tenants *tenants.Module
	roles   *roles.Module
	users   *users.Module
	clients *clients.Module
	oidc    *oidc.Module
}

// New constructs all modules (adapter → service → module) and the router.
func New(cfg config.Config, pool *pgxpool.Pool) (*App, error) {
	q := store.New(pool)

	authMod := auth.New(auth.NewPostgresRepository(q), cfg)
	tenantsMod := tenants.New(tenants.NewPostgresRepository(q))
	rolesMod := roles.New(roles.NewPostgresRepository(q))
	// users depends on the roles service (RoleChecker port) for assignment validation.
	usersMod := users.New(users.NewPostgresRepository(pool), rolesMod.Service())
	clientsMod := clients.New(clients.NewPostgresRepository(q))

	// OIDC provider (the tokens this IdP issues to client apps). Per-tenant issuer.
	oidcMod, err := oidc.New(
		cfg.OIDCBaseURL,
		tenantResolver{svc: tenantsMod.Service()},
		clientStore{svc: clientsMod.Service()},
		userStore{svc: usersMod.Service()},
	)
	if err != nil {
		return nil, err
	}

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.RequestLogger)
	r.Use(chimw.Recoverer)
	r.Use(middleware.CORS(cfg.CORSAllowOrigin))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Route("/api", func(api chi.Router) {
		authMod.RegisterRoutes(api) // /auth/* (login & logout public; /me protected)

		// Every other admin resource requires a valid session.
		api.Group(func(protected chi.Router) {
			protected.Use(authMod.Authenticate)
			tenantsMod.RegisterRoutes(protected)
			rolesMod.RegisterRoutes(protected)
			usersMod.RegisterRoutes(protected)
			clientsMod.RegisterRoutes(protected)
		})
	})

	// Public OIDC endpoints (discovery, jwks, authorize, token, …) per tenant — not behind admin auth.
	r.Handle("/oidc/{tenant}/*", oidcMod.Handler())

	return &App{
		Handler: r,
		auth:    authMod,
		tenants: tenantsMod,
		roles:   rolesMod,
		users:   usersMod,
		clients: clientsMod,
		oidc:    oidcMod,
	}, nil
}

// tenantResolver adapts the tenants service to the oidc.TenantResolver port,
// keeping the oidc module decoupled from the tenants module's domain types.
type tenantResolver struct {
	svc *tenants.Service
}

func (t tenantResolver) TenantByName(ctx context.Context, name string) (oidc.TenantRef, bool, error) {
	tenant, err := t.svc.ByName(ctx, name)
	if errors.Is(err, tenants.ErrNotFound) {
		return oidc.TenantRef{}, false, nil
	}
	if err != nil {
		return oidc.TenantRef{}, false, err
	}
	return oidc.TenantRef{ID: tenant.ID, Name: tenant.Name}, true, nil
}

// clientStore adapts the clients service to the oidc.ClientStore port.
type clientStore struct {
	svc *clients.Service
}

func (c clientStore) ClientByClientID(ctx context.Context, tenantID uuid.UUID, clientID string) (oidc.ClientInfo, bool, error) {
	cl, err := c.svc.ByClientID(ctx, tenantID, clientID)
	if errors.Is(err, clients.ErrNotFound) {
		return oidc.ClientInfo{}, false, nil
	}
	if err != nil {
		return oidc.ClientInfo{}, false, err
	}
	return oidc.ClientInfo{
		ClientID:            cl.ClientID,
		PublicClient:        cl.PublicClient,
		Secret:              cl.Secret,
		RedirectURIs:        cl.RedirectURIs,
		PostLogoutURIs:      cl.PostLogoutRedirectURIs,
		DefaultScopes:       cl.DefaultScopes,
		DirectAccessGrants:  cl.DirectAccessGrants,
		ServiceAccounts:     cl.ServiceAccounts,
		DeviceFlow:          cl.DeviceFlow,
		AccessTokenLifespan: cl.AccessTokenLifespan,
	}, true, nil
}

// userStore adapts the users service to the oidc.UserStore port.
type userStore struct {
	svc *users.Service
}

func (u userStore) Authenticate(ctx context.Context, tenantID uuid.UUID, username, password string) (oidc.AuthUser, bool, error) {
	usr, err := u.svc.Authenticate(ctx, tenantID, username, password)
	if errors.Is(err, users.ErrInvalidLogin) {
		return oidc.AuthUser{}, false, nil
	}
	if err != nil {
		return oidc.AuthUser{}, false, err
	}
	return toAuthUser(usr), true, nil
}

func (u userStore) UserByID(ctx context.Context, id uuid.UUID) (oidc.AuthUser, bool, error) {
	usr, err := u.svc.Get(ctx, id)
	if errors.Is(err, users.ErrNotFound) {
		return oidc.AuthUser{}, false, nil
	}
	if err != nil {
		return oidc.AuthUser{}, false, err
	}
	return toAuthUser(usr), true, nil
}

func toAuthUser(u users.User) oidc.AuthUser {
	return oidc.AuthUser{
		ID:        u.ID,
		Username:  u.Username,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
	}
}

// Bootstrap runs one-time startup seeding for each module + demo data.
func (a *App) Bootstrap(ctx context.Context) error {
	if err := a.auth.Bootstrap(ctx); err != nil {
		return err
	}
	if err := a.tenants.Bootstrap(ctx); err != nil {
		return err
	}
	return a.seedDemoData(ctx)
}
