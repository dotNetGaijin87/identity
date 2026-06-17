-- name: GetAdminByUsername :one
SELECT id, username, email, password_hash, created_at
FROM admin_users
WHERE username = $1;

-- name: GetAdminByID :one
SELECT id, username, email, password_hash, created_at
FROM admin_users
WHERE id = $1;

-- name: CountAdmins :one
SELECT count(*) FROM admin_users;

-- name: CreateAdmin :one
INSERT INTO admin_users (username, email, password_hash)
VALUES ($1, $2, $3)
RETURNING id, username, email, password_hash, created_at;

-- name: CreateSession :one
INSERT INTO admin_sessions (admin_id, token_hash, expires_at)
VALUES ($1, $2, $3)
RETURNING id, admin_id, token_hash, expires_at, created_at;

-- name: GetSessionByHash :one
SELECT id, admin_id, token_hash, expires_at, created_at
FROM admin_sessions
WHERE token_hash = $1;

-- name: DeleteSession :exec
DELETE FROM admin_sessions WHERE token_hash = $1;
