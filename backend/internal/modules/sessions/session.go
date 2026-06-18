// Package sessions tracks end-user SSO login sessions at the IdP. One session is a
// browser login that spans every client the user single-signs-on into. The oidc
// module writes sessions (via a port); the management API lists and revokes them.
package sessions

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Session is a user's active login, with the clients it has signed into.
type Session struct {
	ID         uuid.UUID
	UserID     uuid.UUID
	Username   string
	UserAgent  string
	IPAddress  string
	CreatedAt  time.Time
	LastSeenAt time.Time
	ExpiresAt  time.Time
	Clients    []SessionClient
}

type SessionClient struct {
	ClientID    string
	ClientName  string
	FirstSeenAt time.Time
	LastSeenAt  time.Time
}

var ErrNotFound = errors.New("session not found")
