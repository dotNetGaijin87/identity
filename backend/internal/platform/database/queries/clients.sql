-- name: ListClientsByTenant :many
SELECT * FROM clients WHERE tenant_id = $1 ORDER BY created_at;

-- name: GetClient :one
SELECT * FROM clients WHERE id = $1;

-- name: GetClientByClientID :one
SELECT * FROM clients WHERE tenant_id = $1 AND client_id = $2;

-- name: CreateClient :one
INSERT INTO clients (
    tenant_id, client_id, name, description, enabled, public_client, secret,
    root_url, home_url, redirect_uris, post_logout_redirect_uris, default_scopes,
    direct_access_grants, service_accounts, implicit_flow, device_flow,
    pkce, consent_required, access_token_lifespan, id_token_signature_alg, full_scope_allowed
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
) RETURNING *;

-- name: UpdateClient :one
UPDATE clients SET
    name = $2, description = $3, enabled = $4, public_client = $5, secret = $6,
    root_url = $7, home_url = $8, redirect_uris = $9, post_logout_redirect_uris = $10,
    default_scopes = $11, direct_access_grants = $12, service_accounts = $13,
    implicit_flow = $14, device_flow = $15, pkce = $16, consent_required = $17,
    access_token_lifespan = $18, id_token_signature_alg = $19, full_scope_allowed = $20
WHERE id = $1
RETURNING *;

-- name: UpdateClientSecret :one
UPDATE clients SET secret = $2 WHERE id = $1 RETURNING *;

-- name: DeleteClient :exec
DELETE FROM clients WHERE id = $1;
