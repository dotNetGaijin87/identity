-- name: ListUsersByTenant :many
SELECT id, tenant_id, username, email, first_name, last_name, enabled, created_at
FROM users
WHERE tenant_id = $1
ORDER BY created_at;

-- name: GetUser :one
SELECT id, tenant_id, username, email, first_name, last_name, enabled, created_at
FROM users
WHERE id = $1;

-- name: GetUserByUsername :one
SELECT id, tenant_id, username, email, first_name, last_name, enabled, created_at
FROM users
WHERE tenant_id = $1 AND username = $2;

-- name: CreateUser :one
INSERT INTO users (tenant_id, username, email, first_name, last_name, enabled)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, tenant_id, username, email, first_name, last_name, enabled, created_at;

-- name: UpdateUser :one
UPDATE users
SET email = $2, first_name = $3, last_name = $4, enabled = $5
WHERE id = $1
RETURNING id, tenant_id, username, email, first_name, last_name, enabled, created_at;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- name: GetUserCredentials :one
SELECT id, enabled, password_hash FROM users WHERE tenant_id = $1 AND username = $2;

-- name: SetUserPassword :exec
UPDATE users SET password_hash = $2 WHERE id = $1;

-- name: ListUserRoleIDs :many
SELECT role_id FROM user_roles WHERE user_id = $1;

-- name: ListTenantUserRoles :many
SELECT ur.user_id, ur.role_id
FROM user_roles ur
JOIN users u ON u.id = ur.user_id
WHERE u.tenant_id = $1;

-- name: DeleteUserRoles :exec
DELETE FROM user_roles WHERE user_id = $1;

-- name: AddUserRoles :exec
INSERT INTO user_roles (user_id, role_id)
SELECT sqlc.arg(user_id), unnest(sqlc.arg(role_ids)::uuid[]);
