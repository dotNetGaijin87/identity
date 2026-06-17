-- +goose Up
-- +goose StatementBegin
-- The console uses an opaque server-side session (BFF), not bearer JWTs.
-- Repurpose the admin token table as a sessions table.
ALTER TABLE admin_refresh_tokens RENAME TO admin_sessions;
ALTER INDEX idx_admin_refresh_tokens_admin RENAME TO idx_admin_sessions_admin;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER INDEX idx_admin_sessions_admin RENAME TO idx_admin_refresh_tokens_admin;
ALTER TABLE admin_sessions RENAME TO admin_refresh_tokens;
-- +goose StatementEnd
