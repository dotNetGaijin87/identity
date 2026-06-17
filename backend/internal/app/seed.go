package app

import (
	"context"

	"github.com/google/uuid"

	"idp/internal/modules/clients"
	"idp/internal/modules/roles"
	"idp/internal/modules/users"
)

// seedDemoData populates the "acme" tenant with the demo roles and users (the
// composition root is the right place to orchestrate across modules). Idempotent.
func (a *App) seedDemoData(ctx context.Context) error {
	tenantList, err := a.tenants.Service().List(ctx)
	if err != nil {
		return err
	}
	var acmeID uuid.UUID
	for _, t := range tenantList {
		if t.Name == "acme" {
			acmeID = t.ID
		}
	}
	if acmeID == uuid.Nil {
		return nil
	}

	// Roles
	existingRoles, err := a.roles.Service().List(ctx, acmeID)
	if err != nil {
		return err
	}
	roleID := make(map[string]uuid.UUID)
	if len(existingRoles) == 0 {
		for _, in := range []roles.CreateInput{
			{TenantID: acmeID, Name: "admin", Description: "Full administrative access"},
			{TenantID: acmeID, Name: "developer", Description: "Manage clients and configuration"},
			{TenantID: acmeID, Name: "viewer", Description: "Read-only access"},
		} {
			role, err := a.roles.Service().Create(ctx, in)
			if err != nil {
				return err
			}
			roleID[role.Name] = role.ID
		}
	} else {
		for _, role := range existingRoles {
			roleID[role.Name] = role.ID
		}
	}

	// Users
	existingUsers, err := a.users.Service().List(ctx, acmeID)
	if err != nil {
		return err
	}
	if len(existingUsers) == 0 {
		seeds := []users.CreateInput{
			{
				TenantID: acmeID, Username: "jdoe", Email: "jdoe@acme.example.com",
				FirstName: "Jane", LastName: "Doe", Enabled: true,
				RoleIDs: pick(roleID, "admin", "viewer"),
			},
			{
				TenantID: acmeID, Username: "msmith", Email: "msmith@acme.example.com",
				FirstName: "Mark", LastName: "Smith", Enabled: false,
				RoleIDs: pick(roleID, "developer"),
			},
		}
		for _, in := range seeds {
			if _, err := a.users.Service().Create(ctx, in); err != nil {
				return err
			}
		}
	}

	// Give the demo end-users a password so they can sign in via OIDC (idempotent).
	demoUsers, err := a.users.Service().List(ctx, acmeID)
	if err != nil {
		return err
	}
	for _, u := range demoUsers {
		if u.Username == "jdoe" || u.Username == "msmith" {
			if err := a.users.Service().SetPassword(ctx, u.ID, "password"); err != nil {
				return err
			}
		}
	}

	// Clients
	existingClients, err := a.clients.Service().List(ctx, acmeID)
	if err != nil {
		return err
	}
	if len(existingClients) == 0 {
		seeds := []clients.WriteInput{
			{
				ClientID: "account-console", Name: "Account Console",
				Description: "Built-in account management client",
				Enabled:     true, PublicClient: true,
				RootURL: "https://acme.example.com", HomeURL: "https://acme.example.com/account",
				RedirectURIs:           []string{"https://acme.example.com/account/*"},
				PostLogoutRedirectURIs: []string{"https://acme.example.com"},
				DefaultScopes:          []string{"openid", "profile", "email"},
				PKCE:                   "S256", AccessTokenLifespan: 300, IDTokenSignatureAlg: "RS256",
			},
			{
				ClientID: "backend-api", Name: "Backend API",
				Description: "Confidential service client",
				Enabled:     true, PublicClient: false,
				RedirectURIs:       []string{"https://api.acme.example.com/callback"},
				DefaultScopes:      []string{"openid", "roles"},
				DirectAccessGrants: true, ServiceAccounts: true, FullScopeAllowed: true,
				PKCE: "none", AccessTokenLifespan: 600, IDTokenSignatureAlg: "RS256",
			},
		}
		for _, in := range seeds {
			if _, err := a.clients.Service().Create(ctx, acmeID, in); err != nil {
				return err
			}
		}
	}
	return nil
}

func pick(m map[string]uuid.UUID, names ...string) []uuid.UUID {
	out := make([]uuid.UUID, 0, len(names))
	for _, n := range names {
		if id, ok := m[n]; ok {
			out = append(out, id)
		}
	}
	return out
}
