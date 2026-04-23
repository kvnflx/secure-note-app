package crypto

import (
	"encoding/hex"
	"testing"
)

func TestNewNoteIDUniqueAndSized(t *testing.T) {
	seen := make(map[string]bool)
	for i := 0; i < 1000; i++ {
		id, err := NewNoteID()
		if err != nil {
			t.Fatal(err)
		}
		if len(id) != 16 {
			t.Errorf("want len 16, got %d (%q)", len(id), id)
		}
		if seen[id] {
			t.Fatalf("duplicate id: %s", id)
		}
		seen[id] = true
	}
}

func TestNewKillTokenAndHashRoundtrip(t *testing.T) {
	tok, err := NewKillToken()
	if err != nil {
		t.Fatal(err)
	}
	if len(tok) < 40 {
		t.Errorf("token too short: %q", tok)
	}
	h := HashToken(tok)
	if _, err := hex.DecodeString(h); err != nil {
		t.Errorf("hash not hex: %v", err)
	}
	if HashToken(tok) != h {
		t.Error("hash not deterministic")
	}
	if HashToken(tok+"x") == h {
		t.Error("hash collision on different input")
	}
}

func TestNewPOWSeedLength(t *testing.T) {
	s, err := NewPOWSeed()
	if err != nil {
		t.Fatal(err)
	}
	if len(s) != 64 { // 32 bytes hex
		t.Errorf("want 64 hex chars, got %d", len(s))
	}
}
