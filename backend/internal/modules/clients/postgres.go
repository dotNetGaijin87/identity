package clients

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"idp/internal/platform/database/store"
)

type postgresRepository struct {
	q *store.Queries
}

func NewPostgresRepository(q *store.Queries) Repository {
	return &postgresRepository{q: q}
}

func mapErr(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

// nz returns a non-nil slice (text[] columns are NOT NULL).
func nz(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

func toDomain(c store.Client) Client {
	return Client{
		ID:                     c.ID,
		TenantID:               c.TenantID,
		ClientID:               c.ClientID,
		Name:                   c.Name,
		Description:            c.Description,
		Enabled:                c.Enabled,
		PublicClient:           c.PublicClient,
		Secret:                 c.Secret,
		RootURL:                c.RootUrl,
		HomeURL:                c.HomeUrl,
		RedirectURIs:           nz(c.RedirectUris),
		PostLogoutRedirectURIs: nz(c.PostLogoutRedirectUris),
		DefaultScopes:          nz(c.DefaultScopes),
		DirectAccessGrants:     c.DirectAccessGrants,
		ServiceAccounts:        c.ServiceAccounts,
		ImplicitFlow:           c.ImplicitFlow,
		DeviceFlow:             c.DeviceFlow,
		PKCE:                   c.Pkce,
		ConsentRequired:        c.ConsentRequired,
		AccessTokenLifespan:    int(c.AccessTokenLifespan),
		IDTokenSignatureAlg:    c.IDTokenSignatureAlg,
		FullScopeAllowed:       c.FullScopeAllowed,
		CreatedAt:              c.CreatedAt,
	}
}

func (r *postgresRepository) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Client, error) {
	rows, err := r.q.ListClientsByTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	out := make([]Client, len(rows))
	for i, c := range rows {
		out[i] = toDomain(c)
	}
	return out, nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id uuid.UUID) (Client, error) {
	c, err := r.q.GetClient(ctx, id)
	if err != nil {
		return Client{}, mapErr(err)
	}
	return toDomain(c), nil
}

func (r *postgresRepository) GetByClientIDInTenant(ctx context.Context, tenantID uuid.UUID, clientID string) (Client, error) {
	c, err := r.q.GetClientByClientID(ctx, store.GetClientByClientIDParams{TenantID: tenantID, ClientID: clientID})
	if err != nil {
		return Client{}, mapErr(err)
	}
	return toDomain(c), nil
}

func (r *postgresRepository) Create(ctx context.Context, tenantID uuid.UUID, in WriteInput, secret string) (Client, error) {
	c, err := r.q.CreateClient(ctx, store.CreateClientParams{
		TenantID:               tenantID,
		ClientID:               in.ClientID,
		Name:                   in.Name,
		Description:            in.Description,
		Enabled:                in.Enabled,
		PublicClient:           in.PublicClient,
		Secret:                 secret,
		RootUrl:                in.RootURL,
		HomeUrl:                in.HomeURL,
		RedirectUris:           nz(in.RedirectURIs),
		PostLogoutRedirectUris: nz(in.PostLogoutRedirectURIs),
		DefaultScopes:          nz(in.DefaultScopes),
		DirectAccessGrants:     in.DirectAccessGrants,
		ServiceAccounts:        in.ServiceAccounts,
		ImplicitFlow:           in.ImplicitFlow,
		DeviceFlow:             in.DeviceFlow,
		Pkce:                   in.PKCE,
		ConsentRequired:        in.ConsentRequired,
		AccessTokenLifespan:    int32(in.AccessTokenLifespan),
		IDTokenSignatureAlg:    in.IDTokenSignatureAlg,
		FullScopeAllowed:       in.FullScopeAllowed,
	})
	if err != nil {
		return Client{}, err
	}
	return toDomain(c), nil
}

func (r *postgresRepository) Update(ctx context.Context, id uuid.UUID, in WriteInput, secret string) (Client, error) {
	c, err := r.q.UpdateClient(ctx, store.UpdateClientParams{
		ID:                     id,
		Name:                   in.Name,
		Description:            in.Description,
		Enabled:                in.Enabled,
		PublicClient:           in.PublicClient,
		Secret:                 secret,
		RootUrl:                in.RootURL,
		HomeUrl:                in.HomeURL,
		RedirectUris:           nz(in.RedirectURIs),
		PostLogoutRedirectUris: nz(in.PostLogoutRedirectURIs),
		DefaultScopes:          nz(in.DefaultScopes),
		DirectAccessGrants:     in.DirectAccessGrants,
		ServiceAccounts:        in.ServiceAccounts,
		ImplicitFlow:           in.ImplicitFlow,
		DeviceFlow:             in.DeviceFlow,
		Pkce:                   in.PKCE,
		ConsentRequired:        in.ConsentRequired,
		AccessTokenLifespan:    int32(in.AccessTokenLifespan),
		IDTokenSignatureAlg:    in.IDTokenSignatureAlg,
		FullScopeAllowed:       in.FullScopeAllowed,
	})
	if err != nil {
		return Client{}, mapErr(err)
	}
	return toDomain(c), nil
}

func (r *postgresRepository) UpdateSecret(ctx context.Context, id uuid.UUID, secret string) (Client, error) {
	c, err := r.q.UpdateClientSecret(ctx, store.UpdateClientSecretParams{ID: id, Secret: secret})
	if err != nil {
		return Client{}, mapErr(err)
	}
	return toDomain(c), nil
}

func (r *postgresRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.q.DeleteClient(ctx, id)
}
