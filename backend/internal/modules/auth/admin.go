package auth

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Admin is the domain entity for a console administrator.
type Admin struct {
	ID           uuid.UUID
	Username     string
	Email        string
	PasswordHash string
}

// Session is a server-side admin session.
type Session struct {
	AdminID   uuid.UUID
	ExpiresAt time.Time
}

// ErrNotFound is returned by the repository when no row matches.
var ErrNotFound = errors.New("not found")
