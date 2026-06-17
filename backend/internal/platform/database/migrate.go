package database

import (
	"database/sql"
	"io/fs"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib" // database/sql driver "pgx", used only for migrations
	"github.com/pressly/goose/v3"
)

// Migrate applies all pending migrations from the embedded FS. It waits briefly
// for the database to accept connections (helpful on a cold `docker compose up`).
func Migrate(databaseURL string, fsys fs.FS) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	for i := 0; i < 30; i++ {
		if err = db.Ping(); err == nil {
			break
		}
		time.Sleep(time.Second)
	}
	if err != nil {
		return err
	}

	goose.SetBaseFS(fsys)
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	return goose.Up(db, ".")
}
