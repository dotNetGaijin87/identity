-- +goose Up
-- +goose StatementBegin

-- Console administrators (authenticate via the management API → JWT).
CREATE TABLE admin_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hashed refresh tokens for admin sessions (enables rotation + revocation).
CREATE TABLE admin_refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id   UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_refresh_tokens_admin ON admin_refresh_tokens(admin_id);

-- Tenants (the isolation boundary for users, clients, and roles).
CREATE TABLE tenants (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    enabled      BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE clients (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id                  TEXT NOT NULL,
    name                       TEXT NOT NULL DEFAULT '',
    description                TEXT NOT NULL DEFAULT '',
    enabled                    BOOLEAN NOT NULL DEFAULT true,
    public_client              BOOLEAN NOT NULL DEFAULT true,
    secret                     TEXT NOT NULL DEFAULT '',
    root_url                   TEXT NOT NULL DEFAULT '',
    home_url                   TEXT NOT NULL DEFAULT '',
    redirect_uris              TEXT[] NOT NULL DEFAULT '{}',
    post_logout_redirect_uris  TEXT[] NOT NULL DEFAULT '{}',
    default_scopes             TEXT[] NOT NULL DEFAULT '{}',
    direct_access_grants       BOOLEAN NOT NULL DEFAULT false,
    service_accounts           BOOLEAN NOT NULL DEFAULT false,
    implicit_flow              BOOLEAN NOT NULL DEFAULT false,
    device_flow                BOOLEAN NOT NULL DEFAULT false,
    pkce                       TEXT NOT NULL DEFAULT 'none',
    consent_required           BOOLEAN NOT NULL DEFAULT false,
    access_token_lifespan      INTEGER NOT NULL DEFAULT 300,
    id_token_signature_alg     TEXT NOT NULL DEFAULT 'RS256',
    full_scope_allowed         BOOLEAN NOT NULL DEFAULT false,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, client_id)
);

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username      TEXT NOT NULL,
    email         TEXT NOT NULL DEFAULT '',
    first_name    TEXT NOT NULL DEFAULT '',
    last_name     TEXT NOT NULL DEFAULT '',
    enabled       BOOLEAN NOT NULL DEFAULT true,
    -- Nullable now; required once OIDC end-user login lands (Milestone 5).
    password_hash TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, username)
);

-- Role assignment (replaces the in-memory manyOf relation).
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS admin_refresh_tokens;
DROP TABLE IF EXISTS admin_users;
-- +goose StatementEnd
