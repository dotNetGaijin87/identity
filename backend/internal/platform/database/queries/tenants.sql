-- name: ListTenants :many
SELECT id, name, display_name, enabled, created_at
FROM tenants
ORDER BY created_at;

-- name: GetTenant :one
SELECT id, name, display_name, enabled, created_at
FROM tenants
WHERE id = $1;

-- name: GetTenantByName :one
SELECT id, name, display_name, enabled, created_at
FROM tenants
WHERE name = $1;

-- name: CreateTenant :one
INSERT INTO tenants (name, display_name, enabled)
VALUES ($1, $2, $3)
RETURNING id, name, display_name, enabled, created_at;

-- name: UpdateTenant :one
UPDATE tenants
SET display_name = $2, enabled = $3
WHERE id = $1
RETURNING id, name, display_name, enabled, created_at;

-- name: DeleteTenant :exec
DELETE FROM tenants WHERE id = $1;
