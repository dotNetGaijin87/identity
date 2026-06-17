// Package migrations embeds the SQL migration files so the binary can apply them
// at startup (used by database.Migrate). The .sql files are also read directly by
// goose (CLI) and sqlc.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
