// Package config loads burn-note runtime configuration from environment variables.
package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	ListenAddr      string
	RedisSocket     string
	RedisNetwork    string
	MaxCiphertextKB int
	POWDifficulty   int
	POWSeedTTLSec   int
	ExpiryOptions   []int
	MaxExpirySec    int
}

func Load() (*Config, error) {
	cfg := &Config{
		ListenAddr:      envOr("BURN_LISTEN_ADDR", ":8080"),
		RedisSocket:     os.Getenv("BURN_REDIS_SOCKET"),
		RedisNetwork:    envOr("BURN_REDIS_NETWORK", "unix"),
		MaxCiphertextKB: envInt("BURN_MAX_CIPHERTEXT_KB", 100),
		POWDifficulty:   envInt("BURN_POW_DIFFICULTY", 20),
		POWSeedTTLSec:   envInt("BURN_POW_SEED_TTL_SEC", 300),
		MaxExpirySec:    envInt("BURN_MAX_EXPIRY_SEC", 2592000),
	}
	raw := envOr("BURN_EXPIRY_OPTIONS", "300,3600,86400,604800,2592000")
	for _, s := range strings.Split(raw, ",") {
		n, err := strconv.Atoi(strings.TrimSpace(s))
		if err != nil || n <= 0 {
			return nil, errors.New("invalid BURN_EXPIRY_OPTIONS entry: " + s)
		}
		cfg.ExpiryOptions = append(cfg.ExpiryOptions, n)
	}
	if cfg.RedisSocket == "" {
		return nil, errors.New("BURN_REDIS_SOCKET must be set")
	}
	if cfg.POWDifficulty < 8 || cfg.POWDifficulty > 32 {
		return nil, errors.New("BURN_POW_DIFFICULTY must be in [8,32]")
	}
	return cfg, nil
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func (c *Config) ExpiryAllowed(sec int) bool {
	for _, a := range c.ExpiryOptions {
		if a == sec {
			return true
		}
	}
	return false
}
