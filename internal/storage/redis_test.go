package storage

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
)

func newStore(t *testing.T) (*RedisStore, *miniredis.Miniredis) {
	t.Helper()
	mr := miniredis.RunT(t)
	s, err := NewRedis(RedisConfig{Addr: mr.Addr()})
	if err != nil {
		t.Fatal(err)
	}
	return s, mr
}

func TestPutAndReveal(t *testing.T) {
	s, mr := newStore(t)
	ctx := context.Background()
	n := Note{
		Ciphertext:    []byte("cipher"),
		ExpiresAt:     time.Now().Add(1 * time.Hour),
		KillTokenHash: "hash",
		HasPassword:   false,
	}
	if err := s.PutNote(ctx, "id1", n); err != nil {
		t.Fatal(err)
	}
	got, err := s.RevealNote(ctx, "id1")
	if err != nil {
		t.Fatal(err)
	}
	if string(got.Ciphertext) != "cipher" {
		t.Errorf("ciphertext mismatch")
	}
	// After reveal: gone
	if _, err := s.RevealNote(ctx, "id1"); err != ErrNotFound {
		t.Errorf("expected ErrNotFound on second reveal, got %v", err)
	}
	_ = mr
}

func TestRevealNotFound(t *testing.T) {
	s, _ := newStore(t)
	if _, err := s.RevealNote(context.Background(), "nope"); err != ErrNotFound {
		t.Errorf("want ErrNotFound, got %v", err)
	}
}

func TestKillWithCorrectHash(t *testing.T) {
	s, _ := newStore(t)
	ctx := context.Background()
	s.PutNote(ctx, "id2", Note{KillTokenHash: "goodhash", ExpiresAt: time.Now().Add(time.Hour)})
	if err := s.KillNote(ctx, "id2", "badhash"); err == nil {
		t.Error("expected kill to fail with wrong hash")
	}
	if err := s.KillNote(ctx, "id2", "goodhash"); err != nil {
		t.Errorf("expected kill to succeed, got %v", err)
	}
	if _, err := s.RevealNote(ctx, "id2"); err != ErrNotFound {
		t.Error("expected note gone after kill")
	}
}

func TestPOWIssueAndConsume(t *testing.T) {
	s, _ := newStore(t)
	ctx := context.Background()
	if err := s.IssuePOWSeed(ctx, "s1", 5*time.Minute); err != nil {
		t.Fatal(err)
	}
	if err := s.ConsumePOWSeed(ctx, "s1"); err != nil {
		t.Errorf("expected consume ok, got %v", err)
	}
	if err := s.ConsumePOWSeed(ctx, "s1"); err != ErrPOWSeedInvalid {
		t.Errorf("expected ErrPOWSeedInvalid on second consume, got %v", err)
	}
}
