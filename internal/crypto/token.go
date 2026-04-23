// Package crypto provides secure random identifiers and hash helpers.
package crypto

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base32"
	"encoding/base64"
	"encoding/hex"
)

var noteIDEncoding = base32.StdEncoding.WithPadding(base32.NoPadding)

// NewNoteID returns a 16-character Base32 identifier backed by 80 bits of entropy.
func NewNoteID() (string, error) {
	var b [10]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return noteIDEncoding.EncodeToString(b[:])[:16], nil
}

// NewKillToken returns a 43-character URL-safe Base64 token backed by 256 bits.
func NewKillToken() (string, error) {
	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b[:]), nil
}

// NewPOWSeed returns a 64-character hex string backed by 256 bits.
func NewPOWSeed() (string, error) {
	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(b[:]), nil
}

// HashToken returns the hex-encoded SHA-256 of the token.
func HashToken(tok string) string {
	sum := sha256.Sum256([]byte(tok))
	return hex.EncodeToString(sum[:])
}
