// Package storage defines the persistence interface for notes and PoW seeds.
package storage

import (
	"context"
	"errors"
	"time"
)

var (
	ErrNotFound          = errors.New("storage: not found")
	ErrPOWSeedInvalid    = errors.New("storage: pow seed invalid or spent")
	ErrKillTokenMismatch = errors.New("storage: kill token mismatch")
)

type Note struct {
	Ciphertext    []byte
	ExpiresAt     time.Time
	KillTokenHash string
	HasPassword   bool
}

type Store interface {
	PutNote(ctx context.Context, id string, n Note) error
	RevealNote(ctx context.Context, id string) (Note, error)
	KillNote(ctx context.Context, id, killTokenHash string) error

	IssuePOWSeed(ctx context.Context, seed string, ttl time.Duration) error
	ConsumePOWSeed(ctx context.Context, seed string) error
}
