package auth

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Admin struct {
	ID           uuid.UUID
	Username     string
	Email        string
	PasswordHash string
}

type Session struct {
	AdminID   uuid.UUID
	ExpiresAt time.Time
}

var ErrNotFound = errors.New("not found")
