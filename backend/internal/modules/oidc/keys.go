package oidc

import (
	"crypto/rand"
	"crypto/rsa"

	jose "github.com/go-jose/go-jose/v4"
	"github.com/zitadel/oidc/v3/pkg/op"
)

// Generated in memory at startup; persisting it (stable JWKS across restarts) is a later refinement.
type signingKey struct {
	id  string
	key *rsa.PrivateKey
}

func (s *signingKey) SignatureAlgorithm() jose.SignatureAlgorithm { return jose.RS256 }
func (s *signingKey) Key() any                                    { return s.key }
func (s *signingKey) ID() string                                  { return s.id }

type publicKey struct {
	signing *signingKey
}

func (p *publicKey) ID() string                         { return p.signing.id }
func (p *publicKey) Algorithm() jose.SignatureAlgorithm { return jose.RS256 }
func (p *publicKey) Use() string                        { return "sig" }
func (p *publicKey) Key() any                           { return &p.signing.key.PublicKey }

var _ op.SigningKey = (*signingKey)(nil)
var _ op.Key = (*publicKey)(nil)

func newSigningKey(id string) (*signingKey, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}
	return &signingKey{id: id, key: key}, nil
}
