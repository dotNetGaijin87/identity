package roles

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Role struct {
	ID          uuid.UUID
	TenantID    uuid.UUID
	Name        string
	Description string
	CreatedAt   time.Time
}

type CreateInput struct {
	TenantID    uuid.UUID
	Name        string
	Description string
}

type UpdateInput struct {
	Name        string
	Description string
}

var (
	ErrNotFound     = errors.New("role not found")
	ErrNameRequired = errors.New("role name is required")
	ErrNameTaken    = errors.New("role name already taken")
)
