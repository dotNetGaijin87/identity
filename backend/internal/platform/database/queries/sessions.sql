-- name: CreateUserSession :one
INSERT INTO user_sessions (tenant_id, user_id, token_hash, user_agent, ip_address, expires_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, tenant_id, user_id, token_hash, user_agent, ip_address, created_at, last_seen_at, expires_at, revoked_at;

-- name: GetUserSessionByHash :one
SELECT id, tenant_id, user_id, token_hash, user_agent, ip_address, created_at, last_seen_at, expires_at, revoked_at
FROM user_sessions
WHERE token_hash = $1;

-- name: TouchUserSession :exec
UPDATE user_sessions SET last_seen_at = now() WHERE id = $1;

-- name: RevokeUserSession :execrows
UPDATE user_sessions SET revoked_at = now()
WHERE id = $1 AND tenant_id = $2 AND revoked_at IS NULL;

-- name: UpsertSessionClient :exec
INSERT INTO user_session_clients (session_id, client_id)
VALUES ($1, $2)
ON CONFLICT (session_id, client_id) DO UPDATE SET last_seen_at = now();

-- name: ListActiveSessionsByTenant :many
SELECT s.id, s.user_id, u.username, s.user_agent, s.ip_address, s.created_at, s.last_seen_at, s.expires_at
FROM user_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.tenant_id = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
ORDER BY s.last_seen_at DESC;

-- name: ListActiveSessionClientsByTenant :many
SELECT sc.session_id, sc.client_id, COALESCE(c.name, '') AS client_name, sc.first_seen_at, sc.last_seen_at
FROM user_session_clients sc
JOIN user_sessions s ON s.id = sc.session_id
LEFT JOIN clients c ON c.client_id = sc.client_id AND c.tenant_id = s.tenant_id
WHERE s.tenant_id = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
ORDER BY sc.first_seen_at;
