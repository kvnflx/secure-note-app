package config

import (
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	t.Setenv("BURN_LISTEN_ADDR", "")
	t.Setenv("BURN_REDIS_SOCKET", "/tmp/redis.sock")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.ListenAddr != ":8080" {
		t.Errorf("expected :8080, got %q", cfg.ListenAddr)
	}
	if cfg.MaxCiphertextKB != 100 {
		t.Errorf("expected 100, got %d", cfg.MaxCiphertextKB)
	}
	if cfg.POWDifficulty != 20 {
		t.Errorf("expected 20, got %d", cfg.POWDifficulty)
	}
}

func TestLoadRejectsEmptyRedisSocket(t *testing.T) {
	t.Setenv("BURN_REDIS_SOCKET", "")
	if _, err := Load(); err == nil {
		t.Fatal("expected error for empty redis socket")
	}
}

func TestLoadExpiryOptions(t *testing.T) {
	t.Setenv("BURN_REDIS_SOCKET", "/tmp/redis.sock")
	t.Setenv("BURN_EXPIRY_OPTIONS", "60,300,3600")
	cfg, _ := Load()
	want := []int{60, 300, 3600}
	if len(cfg.ExpiryOptions) != len(want) {
		t.Fatalf("len mismatch: got %v", cfg.ExpiryOptions)
	}
	for i := range want {
		if cfg.ExpiryOptions[i] != want[i] {
			t.Errorf("idx %d: want %d got %d", i, want[i], cfg.ExpiryOptions[i])
		}
	}
}
