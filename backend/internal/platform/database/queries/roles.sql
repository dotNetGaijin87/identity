-- name: ListRolesByTenant :many
SELECT id, tenant_id, name, description, created_at
FROM roles
WHERE tenant_id = $1
ORDER BY created_at;

-- name: GetRole :one
SELECT id, tenant_id, name, description, created_at
FROM roles
WHERE id = $1;

-- name: GetRoleByName :one
SELECT id, tenant_id, name, description, created_at
FROM roles
WHERE tenant_id = $1 AND name = $2;

-- name: CreateRole :one
INSERT INTO roles (tenant_id, name, description)
VALUES ($1, $2, $3)
RETURNING id, tenant_id, name, description, created_at;

-- name: UpdateRole :one
UPDATE roles
SET name = $2, description = $3
WHERE id = $1
RETURNING id, tenant_id, name, description, created_at;

-- name: DeleteRole :exec
DELETE FROM roles WHERE id = $1;

-- name: FilterTenantRoleIDs :many
SELECT id FROM roles
WHERE tenant_id = sqlc.arg(tenant_id) AND id = ANY(sqlc.arg(ids)::uuid[]);
