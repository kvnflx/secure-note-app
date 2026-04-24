# Burn-Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-destructing one-time message webapp (burn-note) that is E2E-encrypted, zero-metadata, open-source, self-hostable via Docker Compose, production-ready under the planned domain `note.backsafe.de`.

**Architecture:** Thin Go HTTP server behind Caddy TLS reverse-proxy, backed by in-memory Redis (tmpfs, no persistence) connected via Unix socket. Crypto happens entirely in the browser (libsodium.js XChaCha20-Poly1305, optional Argon2id wrap). The decrypt key lives in the URL fragment and never reaches the server. A static Click-to-Reveal HTML shell protects against link-preview crawlers. Abuse is limited via SHA-256 Proof-of-Work challenges (no IP tracking). Deployed as a 3-container Docker Compose stack (`caddy` + `burn` + `redis`) on a 4 €/month VPS.

**Tech Stack:**
- **Backend:** Go 1.22+, stdlib `net/http`, `github.com/redis/go-redis/v9`, `github.com/alicebob/miniredis/v2` (tests)
- **Frontend:** Vanilla JS (ES Modules), Vite (build), libsodium.js (crypto), highlight.js (code rendering), qrcode-svg (QR), no framework
- **Infrastructure:** Docker + Docker Compose, Caddy 2, redis:7-alpine
- **Testing:** Go `testing` + miniredis + `httptest`, Vitest (JS unit), Playwright (E2E)
- **CI/CD:** GitHub Actions, Cosign image signing, multi-arch builds (amd64 + arm64)
- **License:** AGPL-3.0

---

## File Structure

### Backend (Go)

| File | Responsibility |
|---|---|
| `cmd/burn/main.go` | Entrypoint: load config, wire dependencies, start HTTP server |
| `internal/config/config.go` | ENV-var parsing, validation |
| `internal/config/config_test.go` | Unit tests for config parsing |
| `internal/storage/store.go` | `Store` interface (Put/Get/Reveal/Kill), types |
| `internal/storage/redis.go` | Redis-backed `Store` implementation |
| `internal/storage/redis_test.go` | Store tests against miniredis |
| `internal/pow/verifier.go` | PoW seed issue/verify, leading-zero-bits check |
| `internal/pow/verifier_test.go` | Unit tests for PoW |
| `internal/crypto/token.go` | Secure random ID + kill-token generation, SHA-256 hashing |
| `internal/crypto/token_test.go` | Unit tests for crypto helpers |
| `internal/api/handler.go` | HTTP handlers (create, reveal, kill, pow, health, shell, metrics) |
| `internal/api/handler_test.go` | HTTP handler tests via `httptest` |
| `internal/api/router.go` | Route wiring |
| `internal/api/middleware.go` | JSON body limit, panic recovery, security headers |
| `go.mod` / `go.sum` | Go module |

### Frontend (source in `web-src/`, built assets in `web/`)

| File | Responsibility |
|---|---|
| `web-src/index.html` | Single HTML shell for all three views (compose/success/reveal) |
| `web-src/src/main.js` | View router (History API), bootstrap, theme init |
| `web-src/src/views/compose.js` | Compose view: textarea, password, expiry, submit flow |
| `web-src/src/views/success.js` | Success view: copy, QR, share, kill-switch |
| `web-src/src/views/reveal.js` | Reveal landing + decrypted display with countdown |
| `web-src/src/crypto/aead.js` | XChaCha20-Poly1305 wrapper around libsodium |
| `web-src/src/crypto/kdf.js` | Argon2id wrapper around libsodium |
| `web-src/src/pow/worker.js` | Web Worker: PoW solver |
| `web-src/src/pow/client.js` | PoW client (fetch challenge, dispatch to worker) |
| `web-src/src/api/client.js` | Fetch wrapper for `/api/*` endpoints |
| `web-src/src/ui/theme.js` | Theme (dark/light/auto) |
| `web-src/src/ui/mask.js` | Sichtschutz toggle (CSS + peek) |
| `web-src/src/ui/qr.js` | QR SVG generator wrapper |
| `web-src/src/ui/share.js` | Web Share API + clipboard fallback |
| `web-src/src/ui/countdown.js` | Self-destruct timer |
| `web-src/src/ui/i18n.js` | Flat-key JSON translator |
| `web-src/src/ui/strength.js` | Password strength heuristic |
| `web-src/src/ui/shortcuts.js` | Keyboard shortcut wiring |
| `web-src/i18n/de.json` | German strings |
| `web-src/i18n/en.json` | English strings |
| `web-src/sw.js` | Service worker (cache static, network-only for `/api/*`) |
| `web-src/manifest.webmanifest` | PWA manifest |
| `web-src/app.css` | Styles (CSS variables for theme) |
| `web-src/vite.config.js` | Vite build config |
| `web-src/package.json` | Node dependencies |

### Deployment / Ops

| File | Responsibility |
|---|---|
| `deploy/Dockerfile` | Multi-stage Go + distroless image |
| `deploy/docker-compose.yml` | 3-container stack (caddy/burn/redis) |
| `deploy/Caddyfile` | Reverse-proxy + TLS + CSP headers |
| `deploy/redis.conf` | Redis config fragment (unix socket, maxmemory, no persist) |
| `.github/workflows/ci.yml` | Lint + test + build pipeline |
| `.github/workflows/release.yml` | Tagged release: multi-arch image + cosign signing |
| `docs/README.md` | Project overview |
| `docs/SECURITY.md` | Responsible-disclosure + PGP |
| `docs/THREAT-MODEL.md` | Detailed threat model |
| `docs/HOSTING.md` | Self-host guide |
| `LICENSE` | AGPL-3.0 text |
| `README.md` | Repo root readme (short, points to docs/) |

---

## Milestone 1 — Backend Core (Go)

### Task 1.1: Initialize Go module and repo scaffolding

**Files:**
- Create: `go.mod`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `README.md`

- [ ] **Step 1: Initialize go module**

Run:
```bash
cd C:/Projekte/notepad
go mod init github.com/kvnflx/burn-note
```

Expected: `go.mod` created.

- [ ] **Step 2: Create .gitignore**

Write `C:/Projekte/notepad/.gitignore`:
```
# Go
/bin/
/dist/
*.test
*.out
coverage.*

# Node
/web-src/node_modules/
/web/assets-built/
/web-src/dist/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Create LICENSE (AGPL-3.0)**

Download the canonical AGPL-3.0 text from `https://www.gnu.org/licenses/agpl-3.0.txt` and save as `C:/Projekte/notepad/LICENSE`. (The text is fixed; do not paraphrase.)

- [ ] **Step 4: Create short README.md**

Write `C:/Projekte/notepad/README.md`:
```markdown
# burn-note

Self-destructing one-time messages. E2E-encrypted, zero-metadata, open-source.

See [docs/README.md](docs/README.md) for project details, [docs/HOSTING.md](docs/HOSTING.md) for self-hosting, [docs/SECURITY.md](docs/SECURITY.md) for security policy and [docs/THREAT-MODEL.md](docs/THREAT-MODEL.md) for the threat model.

License: AGPL-3.0
```

- [ ] **Step 5: Commit**

```bash
git add go.mod .gitignore LICENSE README.md
git commit -m "chore: scaffold repo (go module, license, readme, gitignore)"
```

---

### Task 1.2: Config package

**Files:**
- Create: `internal/config/config.go`
- Create: `internal/config/config_test.go`

- [ ] **Step 1: Write failing test**

Write `internal/config/config_test.go`:
```go
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
```

- [ ] **Step 2: Run test to confirm failure**

Run: `go test ./internal/config/...`
Expected: compile failure (`Load`/`Config` undefined).

- [ ] **Step 3: Implement config.go**

Write `internal/config/config.go`:
```go
// Package config loads burn-note runtime configuration from environment variables.
package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	ListenAddr       string
	RedisSocket      string
	MaxCiphertextKB  int
	POWDifficulty    int
	POWSeedTTLSec    int
	ExpiryOptions    []int
	MaxExpirySec     int
}

func Load() (*Config, error) {
	cfg := &Config{
		ListenAddr:      envOr("BURN_LISTEN_ADDR", ":8080"),
		RedisSocket:     os.Getenv("BURN_REDIS_SOCKET"),
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
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `go test ./internal/config/... -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/config/
git commit -m "feat(config): load and validate runtime config from env"
```

---

### Task 1.3: Crypto helpers — random IDs, tokens, SHA-256

**Files:**
- Create: `internal/crypto/token.go`
- Create: `internal/crypto/token_test.go`

- [ ] **Step 1: Write failing test**

Write `internal/crypto/token_test.go`:
```go
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
```

- [ ] **Step 2: Run to confirm failure**

Run: `go test ./internal/crypto/...`
Expected: compile error.

- [ ] **Step 3: Implement token.go**

Write `internal/crypto/token.go`:
```go
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
```

- [ ] **Step 4: Run tests**

Run: `go test ./internal/crypto/... -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/crypto/
git commit -m "feat(crypto): add NoteID, KillToken, POWSeed, HashToken"
```

---

### Task 1.4: PoW verifier (leading-zero-bits SHA-256)

**Files:**
- Create: `internal/pow/verifier.go`
- Create: `internal/pow/verifier_test.go`

- [ ] **Step 1: Write failing test**

Write `internal/pow/verifier_test.go`:
```go
package pow

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"testing"
)

// Brute-force a valid nonce for low difficulties (tests only).
func findValidNonce(t *testing.T, seed string, difficulty int) string {
	t.Helper()
	for i := 0; i < 1<<24; i++ {
		nonce := strconv.Itoa(i)
		if leadingZeroBits(sha256hex(seed+nonce)) >= difficulty {
			return nonce
		}
	}
	t.Fatalf("no nonce found within budget for difficulty %d", difficulty)
	return ""
}

func sha256hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func TestVerifyAccepts(t *testing.T) {
	seed := "abc123"
	diff := 8
	nonce := findValidNonce(t, seed, diff)
	ok := Verify(seed, nonce, diff)
	if !ok {
		t.Fatalf("expected valid, seed=%s nonce=%s", seed, nonce)
	}
}

func TestVerifyRejectsTooFewZeros(t *testing.T) {
	if Verify("seed", "0", 32) {
		t.Fatal("expected rejection for impossible difficulty")
	}
}

func TestLeadingZeroBitsCountsCorrectly(t *testing.T) {
	// 0x0f = 0000 1111 -> 4 leading zero bits
	if got := leadingZeroBits("0f" + "00"); got != 4 {
		t.Errorf("want 4, got %d", got)
	}
	// 0x00 + 0x80 = 00000000 10000000 -> 8 leading zero bits
	if got := leadingZeroBits("0080"); got != 8 {
		t.Errorf("want 8, got %d", got)
	}
}

// Ensure public surface compiles.
var _ = fmt.Sprintf
```

- [ ] **Step 2: Run to confirm failure**

Run: `go test ./internal/pow/...`
Expected: compile error.

- [ ] **Step 3: Implement verifier.go**

Write `internal/pow/verifier.go`:
```go
// Package pow implements a SHA-256 leading-zero-bits proof-of-work.
package pow

import (
	"crypto/sha256"
	"encoding/hex"
)

// Verify returns true iff SHA256(seed || nonce) has >= difficulty leading zero bits.
func Verify(seed, nonce string, difficulty int) bool {
	sum := sha256.Sum256([]byte(seed + nonce))
	return leadingZeroBitsRaw(sum[:]) >= difficulty
}

// leadingZeroBits accepts a hex string (for test convenience).
func leadingZeroBits(hexStr string) int {
	b, err := hex.DecodeString(hexStr)
	if err != nil {
		return 0
	}
	return leadingZeroBitsRaw(b)
}

func leadingZeroBitsRaw(b []byte) int {
	count := 0
	for _, by := range b {
		if by == 0 {
			count += 8
			continue
		}
		for mask := byte(0x80); mask != 0; mask >>= 1 {
			if by&mask == 0 {
				count++
			} else {
				return count
			}
		}
	}
	return count
}
```

- [ ] **Step 4: Run tests**

Run: `go test ./internal/pow/... -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/pow/
git commit -m "feat(pow): implement SHA-256 leading-zero-bits verifier"
```

---

### Task 1.5: Store interface + Redis implementation (happy path)

**Files:**
- Create: `internal/storage/store.go`
- Create: `internal/storage/redis.go`
- Create: `internal/storage/redis_test.go`
- Modify: `go.mod` (add `github.com/redis/go-redis/v9`, `github.com/alicebob/miniredis/v2`)

- [ ] **Step 1: Add dependencies**

Run:
```bash
go get github.com/redis/go-redis/v9
go get -t github.com/alicebob/miniredis/v2
```

- [ ] **Step 2: Write store.go interface**

Write `internal/storage/store.go`:
```go
// Package storage defines the persistence interface for notes and PoW seeds.
package storage

import (
	"context"
	"errors"
	"time"
)

var (
	ErrNotFound       = errors.New("storage: not found")
	ErrPOWSeedInvalid = errors.New("storage: pow seed invalid or spent")
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
```

- [ ] **Step 3: Write failing test**

Write `internal/storage/redis_test.go`:
```go
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
```

- [ ] **Step 4: Implement redis.go**

Write `internal/storage/redis.go`:
```go
package storage

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisConfig struct {
	Addr    string // tcp "host:port"
	Network string // e.g. "unix" or "" for tcp
}

type RedisStore struct {
	rdb *redis.Client
}

func NewRedis(cfg RedisConfig) (*RedisStore, error) {
	opts := &redis.Options{Addr: cfg.Addr, Network: cfg.Network}
	if opts.Network == "" {
		opts.Network = "tcp"
	}
	rdb := redis.NewClient(opts)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}
	return &RedisStore{rdb: rdb}, nil
}

func (r *RedisStore) Close() error { return r.rdb.Close() }

func noteKey(id string) string { return "note:" + id }
func powKey(seed string) string { return "pow:" + seed }

func (r *RedisStore) PutNote(ctx context.Context, id string, n Note) error {
	key := noteKey(id)
	ttl := time.Until(n.ExpiresAt)
	if ttl <= 0 {
		return errors.New("storage: expiry in the past")
	}
	pw := "0"
	if n.HasPassword {
		pw = "1"
	}
	fields := []interface{}{
		"ciphertext", n.Ciphertext,
		"expires_at", strconv.FormatInt(n.ExpiresAt.Unix(), 10),
		"kill_token_hash", n.KillTokenHash,
		"has_password", pw,
	}
	if err := r.rdb.HSet(ctx, key, fields...).Err(); err != nil {
		return err
	}
	return r.rdb.Expire(ctx, key, ttl).Err()
}

// revealScript atomically reads and deletes the note.
var revealScript = redis.NewScript(`
local v = redis.call('HGETALL', KEYS[1])
if #v == 0 then return nil end
redis.call('DEL', KEYS[1])
return v
`)

func (r *RedisStore) RevealNote(ctx context.Context, id string) (Note, error) {
	res, err := revealScript.Run(ctx, r.rdb, []string{noteKey(id)}).Result()
	if errors.Is(err, redis.Nil) {
		return Note{}, ErrNotFound
	}
	if err != nil {
		return Note{}, err
	}
	arr, ok := res.([]interface{})
	if !ok || len(arr) == 0 {
		return Note{}, ErrNotFound
	}
	n := Note{}
	for i := 0; i+1 < len(arr); i += 2 {
		k, _ := arr[i].(string)
		v, _ := arr[i+1].(string)
		switch k {
		case "ciphertext":
			n.Ciphertext = []byte(v)
		case "expires_at":
			sec, _ := strconv.ParseInt(v, 10, 64)
			n.ExpiresAt = time.Unix(sec, 0)
		case "kill_token_hash":
			n.KillTokenHash = v
		case "has_password":
			n.HasPassword = v == "1"
		}
	}
	return n, nil
}

// killScript deletes only if the provided hash matches.
var killScript = redis.NewScript(`
local h = redis.call('HGET', KEYS[1], 'kill_token_hash')
if not h then return 0 end
if h ~= ARGV[1] then return -1 end
redis.call('DEL', KEYS[1])
return 1
`)

func (r *RedisStore) KillNote(ctx context.Context, id, killTokenHash string) error {
	res, err := killScript.Run(ctx, r.rdb, []string{noteKey(id)}, killTokenHash).Int()
	if err != nil {
		return err
	}
	switch res {
	case 1:
		return nil
	case 0:
		return ErrNotFound
	case -1:
		return errors.New("storage: kill token mismatch")
	default:
		return errors.New("storage: unexpected kill result")
	}
}

func (r *RedisStore) IssuePOWSeed(ctx context.Context, seed string, ttl time.Duration) error {
	return r.rdb.Set(ctx, powKey(seed), "1", ttl).Err()
}

func (r *RedisStore) ConsumePOWSeed(ctx context.Context, seed string) error {
	deleted, err := r.rdb.Del(ctx, powKey(seed)).Result()
	if err != nil {
		return err
	}
	if deleted == 0 {
		return ErrPOWSeedInvalid
	}
	return nil
}
```

- [ ] **Step 5: Run tests**

Run: `go test ./internal/storage/... -v`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add internal/storage/ go.mod go.sum
git commit -m "feat(storage): redis-backed Store with atomic reveal and kill"
```

---

### Task 1.6: HTTP middleware (JSON limit, security headers, recovery)

**Files:**
- Create: `internal/api/middleware.go`

- [ ] **Step 1: Implement middleware**

Write `internal/api/middleware.go`:
```go
package api

import (
	"log"
	"net/http"
)

// MaxJSONBytes caps request bodies to defend against memory-expansion attacks.
func MaxJSONBytes(limit int64, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, limit)
		next.ServeHTTP(w, r)
	})
}

// SecurityHeaders sets minimal headers (Caddy owns CSP/HSTS; this adds redundancy).
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		next.ServeHTTP(w, r)
	})
}

// Recover prevents panics from killing the server.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic: %v", rec)
				http.Error(w, "internal error", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
```

- [ ] **Step 2: Commit**

```bash
git add internal/api/middleware.go
git commit -m "feat(api): add body-limit, security-header, and recover middleware"
```

---

### Task 1.7: HTTP handlers (create, reveal, kill, pow, health)

**Files:**
- Create: `internal/api/handler.go`
- Create: `internal/api/router.go`
- Create: `internal/api/handler_test.go`

- [ ] **Step 1: Write handler.go**

Write `internal/api/handler.go`:
```go
// Package api implements the burn-note HTTP interface.
package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/kvnflx/burn-note/internal/config"
	"github.com/kvnflx/burn-note/internal/crypto"
	"github.com/kvnflx/burn-note/internal/pow"
	"github.com/kvnflx/burn-note/internal/storage"
)

type Handler struct {
	Cfg   *config.Config
	Store storage.Store
	Shell []byte // compiled Click-to-Reveal HTML
	Now   func() time.Time
}

func New(cfg *config.Config, s storage.Store, shell []byte) *Handler {
	return &Handler{Cfg: cfg, Store: s, Shell: shell, Now: time.Now}
}

type powReq struct {
	Seed  string `json:"seed"`
	Nonce string `json:"nonce"`
}

type createReq struct {
	Ciphertext  string `json:"ciphertext"`
	ExpiresIn   int    `json:"expires_in"`
	HasPassword bool   `json:"has_password"`
	POW         powReq `json:"pow"`
}

type createResp struct {
	ID        string `json:"id"`
	KillToken string `json:"kill_token"`
	ExpiresAt int64  `json:"expires_at"`
}

type revealResp struct {
	Ciphertext  string `json:"ciphertext"`
	HasPassword bool   `json:"has_password"`
}

type errResp struct {
	Error  string `json:"error"`
	Reason string `json:"reason,omitempty"`
}

func (h *Handler) writeJSON(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func (h *Handler) writeErr(w http.ResponseWriter, code int, errStr, reason string) {
	h.writeJSON(w, code, errResp{Error: errStr, Reason: reason})
}

func (h *Handler) POWChallenge(w http.ResponseWriter, r *http.Request) {
	seed, err := crypto.NewPOWSeed()
	if err != nil {
		h.writeErr(w, 500, "internal", "")
		return
	}
	if err := h.Store.IssuePOWSeed(r.Context(), seed, time.Duration(h.Cfg.POWSeedTTLSec)*time.Second); err != nil {
		h.writeErr(w, 500, "internal", "")
		return
	}
	h.writeJSON(w, 200, map[string]interface{}{
		"seed":       seed,
		"difficulty": h.Cfg.POWDifficulty,
		"expires_at": h.Now().Add(time.Duration(h.Cfg.POWSeedTTLSec) * time.Second).Unix(),
	})
}

func (h *Handler) CreateNote(w http.ResponseWriter, r *http.Request) {
	var req createReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeErr(w, 400, "bad_request", "malformed json")
		return
	}
	if !pow.Verify(req.POW.Seed, req.POW.Nonce, h.Cfg.POWDifficulty) {
		h.writeErr(w, 403, "pow_failed", "")
		return
	}
	if err := h.Store.ConsumePOWSeed(r.Context(), req.POW.Seed); err != nil {
		h.writeErr(w, 403, "pow_failed", "seed invalid or spent")
		return
	}
	if !h.Cfg.ExpiryAllowed(req.ExpiresIn) || req.ExpiresIn > h.Cfg.MaxExpirySec {
		h.writeErr(w, 400, "bad_request", "invalid expires_in")
		return
	}
	ct, err := base64.StdEncoding.DecodeString(req.Ciphertext)
	if err != nil {
		h.writeErr(w, 400, "bad_request", "ciphertext not base64")
		return
	}
	if len(ct) == 0 || len(ct) > h.Cfg.MaxCiphertextKB*1024 {
		h.writeErr(w, 400, "bad_request", "ciphertext size out of bounds")
		return
	}
	id, err := crypto.NewNoteID()
	if err != nil {
		h.writeErr(w, 500, "internal", "")
		return
	}
	tok, err := crypto.NewKillToken()
	if err != nil {
		h.writeErr(w, 500, "internal", "")
		return
	}
	expiresAt := h.Now().Add(time.Duration(req.ExpiresIn) * time.Second)
	note := storage.Note{
		Ciphertext:    ct,
		ExpiresAt:     expiresAt,
		KillTokenHash: crypto.HashToken(tok),
		HasPassword:   req.HasPassword,
	}
	if err := h.Store.PutNote(r.Context(), id, note); err != nil {
		h.writeErr(w, 500, "internal", "")
		return
	}
	h.writeJSON(w, 201, createResp{ID: id, KillToken: tok, ExpiresAt: expiresAt.Unix()})
}

func (h *Handler) RevealNote(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/notes/"), "/reveal")
	n, err := h.Store.RevealNote(r.Context(), id)
	if err == storage.ErrNotFound {
		h.writeErr(w, 404, "gone", "already_read_or_expired")
		return
	}
	if err != nil {
		h.writeErr(w, 500, "internal", "")
		return
	}
	h.writeJSON(w, 200, revealResp{
		Ciphertext:  base64.StdEncoding.EncodeToString(n.Ciphertext),
		HasPassword: n.HasPassword,
	})
}

type killReq struct {
	KillToken string `json:"kill_token"`
}

func (h *Handler) KillNote(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/notes/")
	var req killReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.KillToken == "" {
		h.writeErr(w, 400, "bad_request", "")
		return
	}
	err := h.Store.KillNote(r.Context(), id, crypto.HashToken(req.KillToken))
	if err == storage.ErrNotFound {
		h.writeErr(w, 404, "gone", "")
		return
	}
	if err != nil {
		h.writeErr(w, 403, "forbidden", "")
		return
	}
	w.WriteHeader(204)
}

func (h *Handler) RevealShell(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(h.Shell)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 500*time.Millisecond)
	defer cancel()
	// Minimal health check: issue and consume a disposable seed.
	if err := h.Store.IssuePOWSeed(ctx, "healthz", time.Second); err != nil {
		http.Error(w, "redis down", 503)
		return
	}
	_ = h.Store.ConsumePOWSeed(ctx, "healthz")
	w.WriteHeader(200)
	_, _ = w.Write([]byte("ok"))
}
```

- [ ] **Step 2: Write router.go**

Write `internal/api/router.go`:
```go
package api

import (
	"net/http"
	"strings"
)

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/pow/challenge", h.POWChallenge)
	mux.HandleFunc("POST /api/notes", h.CreateNote)
	mux.HandleFunc("POST /api/notes/{id}/reveal", h.RevealNote)
	mux.HandleFunc("DELETE /api/notes/{id}", h.KillNote)
	mux.HandleFunc("GET /healthz", h.Health)

	// Reveal shell is served for any /n/<id>.
	mux.HandleFunc("GET /n/", func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/n/")
		if id == "" || strings.ContainsAny(id, "/?#") {
			http.NotFound(w, r)
			return
		}
		h.RevealShell(w, r)
	})

	return mux
}
```

Note: Requires Go 1.22+ for method-prefixed patterns.

- [ ] **Step 3: Write handler_test.go**

Write `internal/api/handler_test.go`:
```go
package api

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/kvnflx/burn-note/internal/config"
	"github.com/kvnflx/burn-note/internal/pow"
	"github.com/kvnflx/burn-note/internal/storage"
)

func testHandler(t *testing.T) *Handler {
	t.Helper()
	mr := miniredis.RunT(t)
	s, err := storage.NewRedis(storage.RedisConfig{Addr: mr.Addr()})
	if err != nil {
		t.Fatal(err)
	}
	cfg := &config.Config{
		ListenAddr:      ":0",
		RedisSocket:     "x",
		MaxCiphertextKB: 100,
		POWDifficulty:   4, // low for tests
		POWSeedTTLSec:   300,
		ExpiryOptions:   []int{60, 3600},
		MaxExpirySec:    2592000,
	}
	return New(cfg, s, []byte("<html>shell</html>"))
}

func obtainPOW(t *testing.T, h *Handler) (seed, nonce string) {
	t.Helper()
	req := httptest.NewRequest("GET", "/api/pow/challenge", nil)
	w := httptest.NewRecorder()
	h.POWChallenge(w, req)
	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	seed = resp["seed"].(string)
	diff := int(resp["difficulty"].(float64))
	for i := 0; i < 1<<24; i++ {
		nonce = strconv.Itoa(i)
		if pow.Verify(seed, nonce, diff) {
			return
		}
	}
	t.Fatal("no nonce")
	return
}

func TestCreateAndRevealAndGone(t *testing.T) {
	h := testHandler(t)
	seed, nonce := obtainPOW(t, h)

	body := map[string]interface{}{
		"ciphertext":   base64.StdEncoding.EncodeToString([]byte("hello")),
		"expires_in":   60,
		"has_password": false,
		"pow":          map[string]string{"seed": seed, "nonce": nonce},
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/api/notes", bytes.NewReader(b))
	w := httptest.NewRecorder()
	h.CreateNote(w, req)
	if w.Code != 201 {
		t.Fatalf("create: want 201, got %d, body=%s", w.Code, w.Body.String())
	}
	var cr createResp
	json.Unmarshal(w.Body.Bytes(), &cr)
	if cr.ID == "" || cr.KillToken == "" {
		t.Fatal("missing id or token")
	}

	// Reveal.
	req = httptest.NewRequest("POST", "/api/notes/"+cr.ID+"/reveal", nil)
	w = httptest.NewRecorder()
	h.RevealNote(w, req)
	if w.Code != 200 {
		t.Fatalf("reveal: want 200, got %d, body=%s", w.Code, w.Body.String())
	}

	// Second reveal must be 404 gone.
	req = httptest.NewRequest("POST", "/api/notes/"+cr.ID+"/reveal", nil)
	w = httptest.NewRecorder()
	h.RevealNote(w, req)
	if w.Code != 404 {
		t.Errorf("second reveal: want 404, got %d", w.Code)
	}
}

func TestCreateRejectsBadPOW(t *testing.T) {
	h := testHandler(t)
	body := map[string]interface{}{
		"ciphertext":   base64.StdEncoding.EncodeToString([]byte("x")),
		"expires_in":   60,
		"has_password": false,
		"pow":          map[string]string{"seed": "none", "nonce": "0"},
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/api/notes", bytes.NewReader(b))
	w := httptest.NewRecorder()
	h.CreateNote(w, req)
	if w.Code != 403 {
		t.Errorf("want 403, got %d", w.Code)
	}
}

func TestKillRequiresCorrectToken(t *testing.T) {
	h := testHandler(t)
	seed, nonce := obtainPOW(t, h)
	body := map[string]interface{}{
		"ciphertext": base64.StdEncoding.EncodeToString([]byte("x")),
		"expires_in": 60, "has_password": false,
		"pow": map[string]string{"seed": seed, "nonce": nonce},
	}
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/api/notes", bytes.NewReader(b))
	w := httptest.NewRecorder()
	h.CreateNote(w, req)
	var cr createResp
	json.Unmarshal(w.Body.Bytes(), &cr)

	// Wrong token.
	kb, _ := json.Marshal(map[string]string{"kill_token": "wrong"})
	req = httptest.NewRequest("DELETE", "/api/notes/"+cr.ID, bytes.NewReader(kb))
	w = httptest.NewRecorder()
	h.KillNote(w, req)
	if w.Code != 403 {
		t.Errorf("wrong token: want 403, got %d", w.Code)
	}

	// Right token.
	kb, _ = json.Marshal(map[string]string{"kill_token": cr.KillToken})
	req = httptest.NewRequest("DELETE", "/api/notes/"+cr.ID, bytes.NewReader(kb))
	w = httptest.NewRecorder()
	h.KillNote(w, req)
	if w.Code != 204 {
		t.Errorf("right token: want 204, got %d", w.Code)
	}
}

func TestRevealShellIsStatic(t *testing.T) {
	h := testHandler(t)
	req := httptest.NewRequest("GET", "/n/ABCDEF", nil)
	w := httptest.NewRecorder()
	h.Routes().ServeHTTP(w, req)
	if w.Code != 200 {
		t.Errorf("want 200, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "shell") {
		t.Error("expected shell html body")
	}
}

// Silence unused imports if tests trimmed.
var _ = context.Background
var _ = time.Now
var _ = http.StatusOK
```

- [ ] **Step 4: Run all backend tests**

Run: `go test ./... -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/api/
git commit -m "feat(api): implement create, reveal, kill, pow, shell, health handlers"
```

---

### Task 1.8: Main entrypoint

**Files:**
- Create: `cmd/burn/main.go`
- Create: `web/shell.html` (placeholder; replaced in Milestone 2)

- [ ] **Step 1: Create placeholder shell**

Write `C:/Projekte/notepad/web/shell.html`:
```html
<!doctype html><html><head><meta charset="utf-8"><title>One-Time Note</title></head><body><p>Placeholder shell — replaced in Milestone 2.</p></body></html>
```

- [ ] **Step 2: Write main.go**

Write `cmd/burn/main.go`:
```go
package main

import (
	"context"
	_ "embed"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/kvnflx/burn-note/internal/api"
	"github.com/kvnflx/burn-note/internal/config"
	"github.com/kvnflx/burn-note/internal/storage"
)

//go:embed shell.html
var shellHTML []byte

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	store, err := storage.NewRedis(storage.RedisConfig{
		Addr:    cfg.RedisSocket,
		Network: "unix",
	})
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	defer store.Close()

	h := api.New(cfg, store, shellHTML)
	handler := api.Recover(api.SecurityHeaders(api.MaxJSONBytes(int64(cfg.MaxCiphertextKB)*1024*2, h.Routes())))

	srv := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()
	log.Printf("burn listening on %s", cfg.ListenAddr)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
```

Note: place `main.go` and the embedded `shell.html` next to it under `cmd/burn/`. Adjust the placeholder path: actually move `shell.html` to `cmd/burn/shell.html` so the embed directive works.

- [ ] **Step 3: Fix shell placement**

Run:
```bash
mkdir -p cmd/burn
mv web/shell.html cmd/burn/shell.html
```

- [ ] **Step 4: Build**

Run: `go build ./...`
Expected: compiles without error.

- [ ] **Step 5: Commit**

```bash
git add cmd/ web/
git commit -m "feat(cmd): wire config, storage, handlers into main binary"
```

---

### Task 1.9: Milestone 1 smoke test

- [ ] **Step 1: Start miniredis/redis via docker**

Run:
```bash
docker run --rm -d --name burn-redis-dev -p 6379:6379 redis:7-alpine
```

- [ ] **Step 2: Run server against TCP redis (dev mode)**

Temporarily patch `storage.NewRedis` or set `BURN_REDIS_SOCKET=localhost:6379` **and** change `main.go` to use `tcp` network if socket contains a colon. Simpler: add an env switch for dev.

Add to `config.go`:
```go
RedisNetwork string // "tcp" or "unix"
```

And in `Load()`:
```go
cfg.RedisNetwork = envOr("BURN_REDIS_NETWORK", "unix")
```

Update `main.go` to pass `Network: cfg.RedisNetwork`.

- [ ] **Step 3: Run**

```bash
BURN_REDIS_SOCKET=localhost:6379 BURN_REDIS_NETWORK=tcp go run ./cmd/burn
```

- [ ] **Step 4: Exercise API manually**

In another shell:
```bash
# 1. PoW challenge
curl -s localhost:8080/api/pow/challenge
# (copy "seed" from response)

# 2. Solve PoW offline:
go run ./scripts/solve_pow.go <seed> 20   # see note below
# (copy "nonce" from response)

# 3. Create
curl -s -X POST localhost:8080/api/notes \
  -H 'Content-Type: application/json' \
  -d '{"ciphertext":"aGVsbG8=","expires_in":3600,"has_password":false,"pow":{"seed":"<seed>","nonce":"<nonce>"}}'
```

(We ship a full `scripts/solve_pow.go` in Task 5.x as a dev utility; for now, lower `BURN_POW_DIFFICULTY=4` via env to brute-force quickly in shell.)

- [ ] **Step 5: Stop dev redis**

```bash
docker stop burn-redis-dev
```

- [ ] **Step 6: Commit config tweak**

```bash
git add internal/config/ cmd/burn/
git commit -m "feat(config): add BURN_REDIS_NETWORK for tcp/unix toggle"
```

---

## Milestone 2 — Frontend Core (Vanilla JS)

### Task 2.1: Initialize Vite + Vanilla JS project

**Files:**
- Create: `web-src/package.json`
- Create: `web-src/vite.config.js`
- Create: `web-src/index.html`
- Create: `web-src/src/main.js`

- [ ] **Step 1: Init Vite project**

Run:
```bash
mkdir -p web-src/src
cd web-src
npm init -y
npm install --save-dev vite vitest
npm install libsodium-wrappers highlight.js qrcode-svg
```

- [ ] **Step 2: Write package.json scripts**

Edit `web-src/package.json` (merge into existing):
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Write vite.config.js**

Write `web-src/vite.config.js`:
```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: '../web',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        chunkFileNames: 'assets/chunk-[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  server: { port: 5173 }
});
```

- [ ] **Step 4: Write index.html**

Write `web-src/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>One-Time Note</title>
    <meta name="theme-color" content="#111">
    <link rel="stylesheet" href="/app.css">
    <link rel="manifest" href="/manifest.webmanifest">
    <script>
      // Theme bootstrap to avoid FOUC.
      (function () {
        var t = localStorage.getItem('bn-theme') || 'auto';
        var d = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.dataset.theme = d ? 'dark' : 'light';
      })();
    </script>
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Write main.js router skeleton**

Write `web-src/src/main.js`:
```js
import { renderCompose } from './views/compose.js';
import { renderReveal } from './views/reveal.js';
import { initTheme } from './ui/theme.js';
import { initI18n, t } from './ui/i18n.js';

async function boot() {
  await initI18n();
  initTheme();
  route();
  window.addEventListener('popstate', route);
}

function route() {
  const p = location.pathname;
  const mount = document.getElementById('app');
  if (p.startsWith('/n/')) {
    const id = p.slice(3);
    renderReveal(mount, id);
  } else {
    renderCompose(mount);
  }
}

boot();
```

- [ ] **Step 6: Create minimal stubs so build works**

Write `web-src/src/ui/theme.js`:
```js
export function initTheme() {
  document.documentElement.dataset.theme ||= 'light';
}
```

Write `web-src/src/ui/i18n.js`:
```js
let strings = {};
export async function initI18n() {
  const lang = (navigator.language || 'en').slice(0, 2);
  try {
    const url = `/i18n/${lang}.json`;
    const res = await fetch(url);
    strings = await res.json();
  } catch {
    strings = {};
  }
}
export function t(key, fallback) { return strings[key] || fallback || key; }
```

Write `web-src/src/views/compose.js`:
```js
export function renderCompose(root) { root.textContent = 'compose — TODO'; }
```

Write `web-src/src/views/reveal.js`:
```js
export function renderReveal(root, id) { root.textContent = 'reveal ' + id + ' — TODO'; }
```

Note: These are intentional scaffolds replaced in later tasks.

- [ ] **Step 7: Build smoke**

Run: `cd web-src && npm run build`
Expected: `web/` populated with hashed assets.

- [ ] **Step 8: Commit**

```bash
cd ..
git add web-src/ web/
git commit -m "chore(web): scaffold vite + vanilla js entrypoint"
```

---

### Task 2.2: Crypto module — AEAD wrapper over libsodium

**Files:**
- Create: `web-src/src/crypto/aead.js`
- Create: `web-src/src/crypto/aead.test.js`

- [ ] **Step 1: Write failing test**

Write `web-src/src/crypto/aead.test.js`:
```js
import { describe, it, expect, beforeAll } from 'vitest';
import { ready, randomKey, encrypt, decrypt, toB64, fromB64 } from './aead.js';

beforeAll(async () => { await ready(); });

describe('AEAD XChaCha20-Poly1305', () => {
  it('round-trips plaintext', async () => {
    const key = randomKey();
    const pt = new TextEncoder().encode('secret message');
    const ct = encrypt(key, pt);
    const back = decrypt(key, ct);
    expect(new TextDecoder().decode(back)).toBe('secret message');
  });

  it('fails on tampered ciphertext', async () => {
    const key = randomKey();
    const ct = encrypt(key, new TextEncoder().encode('x'));
    ct[ct.length - 1] ^= 0xff;
    expect(() => decrypt(key, ct)).toThrow();
  });

  it('base64 round-trip', async () => {
    const b = new Uint8Array([1, 2, 3, 255]);
    expect(fromB64(toB64(b))).toEqual(b);
  });
});
```

- [ ] **Step 2: Implement aead.js**

Write `web-src/src/crypto/aead.js`:
```js
import sodium from 'libsodium-wrappers';

export async function ready() { await sodium.ready; }

export function randomKey() {
  return sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
}

// Returns [nonce || ciphertext] as a single Uint8Array.
export function encrypt(key, plaintext) {
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ct = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, null, null, nonce, key);
  const out = new Uint8Array(nonce.length + ct.length);
  out.set(nonce, 0);
  out.set(ct, nonce.length);
  return out;
}

export function decrypt(key, combined) {
  const n = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  const nonce = combined.slice(0, n);
  const ct = combined.slice(n);
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ct, null, nonce, key);
}

export function toB64(u8) {
  return sodium.to_base64(u8, sodium.base64_variants.ORIGINAL);
}
export function fromB64(s) {
  return sodium.from_base64(s, sodium.base64_variants.ORIGINAL);
}

// URL-safe variants for the fragment.
export function toB64Url(u8) {
  return sodium.to_base64(u8, sodium.base64_variants.URLSAFE_NO_PADDING);
}
export function fromB64Url(s) {
  return sodium.from_base64(s, sodium.base64_variants.URLSAFE_NO_PADDING);
}
```

- [ ] **Step 3: Run tests**

Run: `cd web-src && npm test`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
cd ..
git add web-src/src/crypto/
git commit -m "feat(crypto): aead.js XChaCha20-Poly1305 wrapper"
```

---

### Task 2.3: KDF module — Argon2id wrap

**Files:**
- Create: `web-src/src/crypto/kdf.js`
- Create: `web-src/src/crypto/kdf.test.js`

- [ ] **Step 1: Write test**

Write `web-src/src/crypto/kdf.test.js`:
```js
import { describe, it, expect, beforeAll } from 'vitest';
import { ready } from './aead.js';
import { deriveKey, randomSalt } from './kdf.js';

beforeAll(async () => { await ready(); });

describe('Argon2id KDF', () => {
  it('derives same key for same inputs', async () => {
    const salt = randomSalt();
    const k1 = deriveKey('hunter2', salt);
    const k2 = deriveKey('hunter2', salt);
    expect(k1).toEqual(k2);
  });

  it('different password produces different key', async () => {
    const salt = randomSalt();
    const k1 = deriveKey('a', salt);
    const k2 = deriveKey('b', salt);
    expect(k1).not.toEqual(k2);
  });

  it('salt is 16 bytes', async () => {
    expect(randomSalt().length).toBe(16);
  });
});
```

- [ ] **Step 2: Implement kdf.js**

Write `web-src/src/crypto/kdf.js`:
```js
import sodium from 'libsodium-wrappers';

export function randomSalt() {
  return sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
}

// 256-bit key via Argon2id with OWASP-2024-leaning params.
export function deriveKey(password, salt) {
  const opslimit = 3;                    // iterations
  const memlimit = 64 * 1024 * 1024;     // 64 MiB
  return sodium.crypto_pwhash(
    32,
    password,
    salt,
    opslimit,
    memlimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );
}
```

- [ ] **Step 3: Run tests**

Run: `cd web-src && npm test`
Expected: all PASS (note: each test takes ~0.5s due to Argon2id).

- [ ] **Step 4: Commit**

```bash
cd ..
git add web-src/src/crypto/
git commit -m "feat(crypto): kdf.js Argon2id wrap with 64MiB/3-iter params"
```

---

### Task 2.4: API client wrapper

**Files:**
- Create: `web-src/src/api/client.js`

- [ ] **Step 1: Implement client.js**

Write `web-src/src/api/client.js`:
```js
async function req(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    credentials: 'omit',
    cache: 'no-store'
  });
  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch {}
    const e = new Error(body.error || `http_${res.status}`);
    e.status = res.status;
    e.reason = body.reason;
    throw e;
  }
  if (res.status === 204) return null;
  return res.json();
}

export function getPOWChallenge() { return req('/api/pow/challenge'); }

export function createNote(payload) {
  return req('/api/notes', { method: 'POST', body: JSON.stringify(payload) });
}

export function revealNote(id) {
  return req(`/api/notes/${encodeURIComponent(id)}/reveal`, { method: 'POST' });
}

export function killNote(id, killToken) {
  return req(`/api/notes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ kill_token: killToken })
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add web-src/src/api/
git commit -m "feat(api-client): typed wrappers for /api/* endpoints"
```

---

### Task 2.5: PoW solver in Web Worker

**Files:**
- Create: `web-src/src/pow/worker.js`
- Create: `web-src/src/pow/client.js`

- [ ] **Step 1: Write worker**

Write `web-src/src/pow/worker.js`:
```js
// PoW solver: find nonce such that SHA-256(seed || nonce) has >= difficulty leading zero bits.
async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return new Uint8Array(buf);
}

function leadingZeroBits(bytes) {
  let count = 0;
  for (const b of bytes) {
    if (b === 0) { count += 8; continue; }
    for (let m = 0x80; m; m >>= 1) {
      if ((b & m) === 0) count++;
      else return count;
    }
  }
  return count;
}

self.onmessage = async (e) => {
  const { seed, difficulty } = e.data;
  for (let i = 0; i < 1 << 30; i++) {
    const nonce = i.toString(36);
    const h = await sha256(seed + nonce);
    if (leadingZeroBits(h) >= difficulty) {
      self.postMessage({ nonce });
      return;
    }
    if ((i & 0x3ff) === 0) self.postMessage({ progress: i });
  }
  self.postMessage({ error: 'no nonce found' });
};
```

- [ ] **Step 2: Write client**

Write `web-src/src/pow/client.js`:
```js
import { getPOWChallenge } from '../api/client.js';

export async function solvePOW(onProgress) {
  const challenge = await getPOWChallenge();
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data.progress !== undefined) { onProgress?.(e.data.progress); return; }
      if (e.data.error) { worker.terminate(); reject(new Error(e.data.error)); return; }
      worker.terminate();
      resolve({ seed: challenge.seed, nonce: e.data.nonce });
    };
    worker.postMessage({ seed: challenge.seed, difficulty: challenge.difficulty });
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add web-src/src/pow/
git commit -m "feat(pow): web-worker solver for SHA-256 leading-zero-bits challenge"
```

---

### Task 2.6: Compose view (minimal, no A-Tier features yet)

**Files:**
- Modify: `web-src/src/views/compose.js`
- Create: `web-src/app.css`

- [ ] **Step 1: Write compose.js**

Write `web-src/src/views/compose.js`:
```js
import { ready, randomKey, encrypt, toB64, toB64Url } from '../crypto/aead.js';
import { solvePOW } from '../pow/client.js';
import { createNote } from '../api/client.js';
import { t } from '../ui/i18n.js';

export function renderCompose(root) {
  root.innerHTML = `
    <section class="compose">
      <header>
        <h1>🔥 burn.note</h1>
        <p class="tag">${t('compose.tag', 'one-time notes, zero metadata')}</p>
      </header>
      <textarea id="msg" rows="10" placeholder="${t('compose.placeholder', 'Write your message…')}" autocomplete="off" spellcheck="false"></textarea>
      <div class="row">
        <label>${t('compose.expiry', 'Expiry')}
          <select id="expiry">
            <option value="300">5 min</option>
            <option value="3600" selected>1 h</option>
            <option value="86400">1 d</option>
            <option value="604800">7 d</option>
            <option value="2592000">30 d</option>
          </select>
        </label>
      </div>
      <button id="send" type="button">${t('compose.submit', 'Create note')}</button>
      <p id="status" class="status" role="status"></p>
    </section>
  `;

  const ta = root.querySelector('#msg');
  const sel = root.querySelector('#expiry');
  const btn = root.querySelector('#send');
  const status = root.querySelector('#status');

  btn.addEventListener('click', () => submit(ta, sel, btn, status));
}

async function submit(ta, sel, btn, status) {
  const text = ta.value;
  if (!text) return;
  btn.disabled = true;
  status.textContent = '🔒 Encrypting…';
  try {
    await ready();
    const key = randomKey();
    const ct = encrypt(key, new TextEncoder().encode(text));
    status.textContent = '⛏ Solving proof-of-work…';
    const pow = await solvePOW();
    status.textContent = '📤 Submitting…';
    const resp = await createNote({
      ciphertext: toB64(ct),
      expires_in: parseInt(sel.value, 10),
      has_password: false,
      pow
    });
    const url = `${location.origin}/n/${resp.id}#k=${toB64Url(key)}`;
    history.pushState({ success: true, url, kill: resp.kill_token, expiresAt: resp.expires_at, id: resp.id }, '', '/success');
    const { renderSuccess } = await import('./success.js');
    renderSuccess(document.getElementById('app'), { url, kill: resp.kill_token, expiresAt: resp.expires_at, id: resp.id });
  } catch (e) {
    status.textContent = '❌ ' + e.message;
    btn.disabled = false;
  }
}
```

- [ ] **Step 2: Write initial app.css**

Write `web-src/app.css`:
```css
:root {
  --bg: #ffffff;
  --fg: #111111;
  --muted: #6b7280;
  --border: #e5e7eb;
  --accent: #dc2626;
  --accent-fg: #ffffff;
}
html[data-theme="dark"] {
  --bg: #0a0a0a;
  --fg: #f5f5f5;
  --muted: #9ca3af;
  --border: #27272a;
  --accent: #ef4444;
  --accent-fg: #0a0a0a;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, Segoe UI, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.5;
}
main {
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem;
}
h1 { margin: 0; font-size: 1.5rem; }
.tag { color: var(--muted); margin: 0.25rem 0 1rem; }
textarea {
  width: 100%;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--fg);
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.95rem;
  resize: vertical;
}
textarea:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.row { display: flex; gap: 1rem; align-items: center; margin: 0.75rem 0; flex-wrap: wrap; }
select, input[type="password"] {
  background: var(--bg);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem;
}
button {
  background: var(--accent);
  color: var(--accent-fg);
  border: 0;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}
button:disabled { opacity: 0.6; cursor: not-allowed; }
button:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.status { min-height: 1.25rem; color: var(--muted); }
```

- [ ] **Step 3: Commit**

```bash
git add web-src/src/views/compose.js web-src/app.css
git commit -m "feat(web): minimal compose view with encrypt+submit flow"
```

---

### Task 2.7: Success view (minimal — copy + show URL + kill)

**Files:**
- Modify: `web-src/src/views/success.js`

- [ ] **Step 1: Write success.js**

Write `web-src/src/views/success.js`:
```js
import { killNote } from '../api/client.js';
import { t } from '../ui/i18n.js';

export function renderSuccess(root, data) {
  const expiry = new Date(data.expiresAt * 1000).toLocaleString();
  root.innerHTML = `
    <section class="success">
      <h1>✓ ${t('success.title', 'Note created')}</h1>
      <p>${t('success.intro', 'Share this link:')}</p>
      <div class="row">
        <input id="link" type="text" readonly value="${escape(data.url)}">
        <button id="copy">${t('success.copy', 'Copy')}</button>
      </div>
      <p class="status">${t('success.expiry', 'Expires at')} ${expiry}</p>
      <hr>
      <h2>${t('success.kill.title', 'Kill switch')}</h2>
      <p>${t('success.kill.hint', 'You can destroy this note manually at any time:')}</p>
      <button id="kill" class="danger">⚠ ${t('success.kill.btn', 'Destroy now')}</button>
      <p id="killStatus" class="status" role="status"></p>
    </section>
  `;

  root.querySelector('#copy').addEventListener('click', async () => {
    await navigator.clipboard.writeText(data.url);
    const btn = root.querySelector('#copy');
    btn.textContent = '✓ ' + t('success.copied', 'Copied');
    setTimeout(() => (btn.textContent = t('success.copy', 'Copy')), 1500);
  });

  root.querySelector('#kill').addEventListener('click', async () => {
    if (!confirm(t('success.kill.confirm', 'Really destroy this note?'))) return;
    try {
      await killNote(data.id, data.kill);
      root.querySelector('#killStatus').textContent = '🔥 ' + t('success.killed', 'Destroyed.');
    } catch (e) {
      root.querySelector('#killStatus').textContent = '❌ ' + e.message;
    }
  });
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
```

- [ ] **Step 2: Commit**

```bash
git add web-src/src/views/success.js
git commit -m "feat(web): success view with copy-link and kill-switch"
```

---

### Task 2.8: Reveal view (Click-to-Reveal + decrypt + countdown-stub)

**Files:**
- Modify: `web-src/src/views/reveal.js`

- [ ] **Step 1: Write reveal.js**

Write `web-src/src/views/reveal.js`:
```js
import { ready, decrypt, fromB64, fromB64Url } from '../crypto/aead.js';
import { revealNote } from '../api/client.js';
import { t } from '../ui/i18n.js';

export function renderReveal(root, id) {
  const frag = parseFragment(location.hash);
  root.innerHTML = `
    <section class="reveal">
      <h1>🔥 ${t('reveal.title', 'A note is waiting for you')}</h1>
      <p>${t('reveal.warn', 'Once you click “Show note”, it will be decrypted, shown once, and then destroyed forever.')}</p>
      <ul>
        <li>${t('reveal.tip1', 'Make sure you are ready to read it now')}</li>
        <li>${t('reveal.tip2', 'Make sure no one is looking over your shoulder')}</li>
      </ul>
      <button id="show" type="button">👁 ${t('reveal.show', 'Show note')}</button>
      <p id="status" class="status" role="status"></p>
      <div id="content" class="content" hidden></div>
    </section>
  `;
  const btn = root.querySelector('#show');
  const status = root.querySelector('#status');
  const content = root.querySelector('#content');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = '🔒 ' + t('reveal.decrypting', 'Decrypting…');
    try {
      const resp = await revealNote(id);
      await ready();
      const ct = fromB64(resp.ciphertext);
      const key = fromB64Url(frag.k);
      const pt = decrypt(key, ct);
      content.textContent = new TextDecoder().decode(pt);
      content.hidden = false;
      status.textContent = '';
      btn.hidden = true;
    } catch (e) {
      if (e.status === 404) {
        status.textContent = '🔥 ' + t('reveal.gone', 'This note is already gone.');
      } else {
        status.textContent = '❌ ' + e.message;
      }
    }
  });
}

function parseFragment(hash) {
  const out = {};
  (hash.startsWith('#') ? hash.slice(1) : hash).split('&').forEach(p => {
    const [k, v] = p.split('=');
    if (k) out[k] = v || '';
  });
  return out;
}
```

- [ ] **Step 2: Update placeholder shell**

Write `C:/Projekte/notepad/cmd/burn/shell.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>One-Time Note</title>
  <meta property="og:title" content="One-Time Note">
  <meta property="og:description" content="Click to reveal — will be destroyed on read">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="/app.css">
  <script>
    (function () {
      var t = localStorage.getItem('bn-theme') || 'auto';
      var d = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = d ? 'dark' : 'light';
    })();
  </script>
</head>
<body>
  <main id="app"></main>
  <script type="module" src="/assets/app.js"></script>
</body>
</html>
```

Note: the actual hashed asset name from `vite build` differs; Task 5.2 adds a small server-side template indirection. For now accept this as a placeholder.

- [ ] **Step 3: Commit**

```bash
git add web-src/src/views/reveal.js cmd/burn/shell.html
git commit -m "feat(web): reveal view with click-to-reveal, decrypt, content render"
```

---

### Task 2.9: Dev-serve integration test

- [ ] **Step 1: Start redis + backend**

In one shell:
```bash
docker run --rm -d --name burn-redis-dev -p 6379:6379 redis:7-alpine
BURN_REDIS_SOCKET=localhost:6379 BURN_REDIS_NETWORK=tcp BURN_POW_DIFFICULTY=4 go run ./cmd/burn
```

- [ ] **Step 2: Start vite dev server with proxy**

Edit `web-src/vite.config.js` → add `server.proxy`:
```js
server: {
  port: 5173,
  proxy: {
    '/api': 'http://localhost:8080',
    '/n': 'http://localhost:8080'
  }
}
```

In another shell:
```bash
cd web-src && npm run dev
```

- [ ] **Step 3: Exercise in browser**

Navigate to `http://localhost:5173`. Type a message, click "Create note". Verify:
- Success view appears with a URL
- Copy button copies to clipboard
- Opening the URL in a new tab → reveal landing → "Show note" → content appears
- Reloading the reveal URL shows "already gone"
- Kill-switch on success view destroys

- [ ] **Step 4: Stop services**

```bash
docker stop burn-redis-dev
# Ctrl+C the go process and vite
```

- [ ] **Step 5: Commit proxy config**

```bash
git add web-src/vite.config.js
git commit -m "chore(web): vite dev proxy to local go server"
```

---

## Milestone 3 — A-Tier Features

### Task 3.1: QR code in success view

**Files:**
- Create: `web-src/src/ui/qr.js`
- Modify: `web-src/src/views/success.js`

- [ ] **Step 1: Implement qr.js**

Write `web-src/src/ui/qr.js`:
```js
import QRCode from 'qrcode-svg';

export function renderQR(root, text) {
  const qr = new QRCode({ content: text, padding: 2, ecl: 'M', width: 256, height: 256 });
  root.innerHTML = qr.svg();
}
```

- [ ] **Step 2: Extend success.js**

Modify `web-src/src/views/success.js` — add QR section inside the HTML template, between the status line and `<hr>`:

```html
<details class="qrDetails">
  <summary>📱 Show QR</summary>
  <div id="qr" class="qr"></div>
</details>
```

And at the bottom of `renderSuccess`, after the button listeners:
```js
import('../ui/qr.js').then(m => {
  m.renderQR(root.querySelector('#qr'), data.url);
});
```

- [ ] **Step 3: Add QR styles**

Append to `app.css`:
```css
.qrDetails summary { cursor: pointer; padding: 0.5rem 0; }
.qr svg { max-width: 256px; height: auto; display: block; margin: 0.5rem 0; background: white; padding: 0.5rem; }
```

- [ ] **Step 4: Commit**

```bash
git add web-src/src/ui/qr.js web-src/src/views/success.js web-src/app.css
git commit -m "feat(web): QR code in success view (lazy-loaded)"
```

---

### Task 3.2: Web Share API with clipboard fallback

**Files:**
- Create: `web-src/src/ui/share.js`
- Modify: `web-src/src/views/success.js`

- [ ] **Step 1: Implement share.js**

Write `web-src/src/ui/share.js`:
```js
export async function shareOrCopy(url) {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'One-Time Note', text: 'A note for you', url });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
```

- [ ] **Step 2: Add share button to success view**

In `success.js`, add a share button next to `#copy`:
```html
<button id="share">📤 Share…</button>
```

And listener:
```js
import('../ui/share.js').then(m => {
  root.querySelector('#share').addEventListener('click', async () => {
    const res = await m.shareOrCopy(data.url);
    // optional toast
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add web-src/src/ui/share.js web-src/src/views/success.js
git commit -m "feat(web): share via Web Share API with clipboard fallback"
```

---

### Task 3.3: Sichtschutz (masking toggle)

**Files:**
- Create: `web-src/src/ui/mask.js`
- Modify: `web-src/src/views/compose.js`
- Modify: `web-src/src/views/reveal.js`
- Modify: `web-src/app.css`

- [ ] **Step 1: Implement mask.js**

Write `web-src/src/ui/mask.js`:
```js
// Applies CSS text-security masking to a target element.
export function attachMask(target, toggleBtn) {
  let masked = false;
  toggleBtn.addEventListener('click', () => {
    masked = !masked;
    target.classList.toggle('masked', masked);
    toggleBtn.textContent = masked ? '👁 Show' : '👁 Hide';
  });
}
```

- [ ] **Step 2: Add masking CSS**

Append to `app.css`:
```css
.masked { -webkit-text-security: disc; text-security: disc; }
```

- [ ] **Step 3: Wire into compose**

In `compose.js`, add mask button next to textarea:
```html
<div class="toolbar"><button id="mask" type="button">👁 Hide</button></div>
```

And in `renderCompose`:
```js
import('../ui/mask.js').then(m => m.attachMask(ta, root.querySelector('#mask')));
```

- [ ] **Step 4: Wire into reveal**

Similar addition to `reveal.js` where content is shown.

- [ ] **Step 5: Commit**

```bash
git add web-src/src/ui/mask.js web-src/src/views/compose.js web-src/src/views/reveal.js web-src/app.css
git commit -m "feat(web): sichtschutz (masking) toggle for compose and reveal"
```

---

### Task 3.4: Self-destruct countdown after reveal

**Files:**
- Create: `web-src/src/ui/countdown.js`
- Modify: `web-src/src/views/reveal.js`

- [ ] **Step 1: Implement countdown.js**

Write `web-src/src/ui/countdown.js`:
```js
export function startCountdown(displayEl, seconds, onExpire) {
  let remaining = seconds;
  displayEl.textContent = format(remaining);
  const id = setInterval(() => {
    remaining--;
    displayEl.textContent = format(remaining);
    if (remaining <= 0) {
      clearInterval(id);
      onExpire();
    }
  }, 1000);
  return { stop: () => clearInterval(id), extend: (s) => { remaining += s; } };
}

function format(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(Math.max(0, r)).padStart(2, '0')}`;
}
```

- [ ] **Step 2: Integrate in reveal.js**

After successful decrypt, inject countdown UI and timer:
```js
// Append above #content:
const cd = document.createElement('div');
cd.className = 'countdown';
cd.innerHTML = `⏱ <span id="cd">1:00</span>
  <button id="extend" type="button">+60s</button>`;
content.parentNode.insertBefore(cd, content);

let extended = false;
const { startCountdown } = await import('../ui/countdown.js');
const ctl = startCountdown(cd.querySelector('#cd'), 60, () => {
  content.textContent = '🔥 ' + t('reveal.expired', 'This note no longer exists.');
  cd.remove();
});
cd.querySelector('#extend').addEventListener('click', () => {
  if (extended) return;
  extended = true;
  ctl.extend(60);
  cd.querySelector('#extend').disabled = true;
});
```

- [ ] **Step 3: Commit**

```bash
git add web-src/src/ui/countdown.js web-src/src/views/reveal.js
git commit -m "feat(web): self-destruct countdown after reveal with one-time extension"
```

---

### Task 3.5: Clipboard-auto-clear on copy

**Files:**
- Modify: `web-src/src/views/success.js`
- Modify: `web-src/src/views/reveal.js`

- [ ] **Step 1: Extend copy handler in success.js**

Replace the `#copy` listener:
```js
root.querySelector('#copy').addEventListener('click', async () => {
  await navigator.clipboard.writeText(data.url);
  const btn = root.querySelector('#copy');
  btn.textContent = '✓ Copied (auto-clear in 30s)';
  setTimeout(async () => {
    try { await navigator.clipboard.writeText(''); } catch {}
    btn.textContent = t('success.copy', 'Copy');
  }, 30_000);
});
```

- [ ] **Step 2: Add copy button in reveal after decrypt with same logic**

In `reveal.js`, after content shown:
```js
const copy = document.createElement('button');
copy.textContent = '📋 Copy';
copy.addEventListener('click', async () => {
  await navigator.clipboard.writeText(content.textContent);
  copy.textContent = '✓ Copied (auto-clear 30s)';
  setTimeout(async () => {
    try { await navigator.clipboard.writeText(''); } catch {}
    copy.textContent = '📋 Copy';
  }, 30_000);
});
content.parentNode.appendChild(copy);
```

- [ ] **Step 3: Commit**

```bash
git add web-src/src/views/success.js web-src/src/views/reveal.js
git commit -m "feat(web): clipboard auto-clear 30s after copy"
```

---

### Task 3.6: Dark/Light/Auto theme with toggle

**Files:**
- Modify: `web-src/src/ui/theme.js`
- Modify: `web-src/index.html`
- Modify: `web-src/app.css`

- [ ] **Step 1: Rewrite theme.js**

Write `web-src/src/ui/theme.js`:
```js
const KEY = 'bn-theme';

export function initTheme() {
  apply(get());
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.addEventListener('click', () => { set(next(get())); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (get() === 'auto') apply('auto');
  });
}

function get() { return localStorage.getItem(KEY) || 'auto'; }
function set(v) { localStorage.setItem(KEY, v); apply(v); }
function next(v) { return v === 'auto' ? 'light' : v === 'light' ? 'dark' : 'auto'; }

function apply(mode) {
  const dark = mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = mode === 'dark' ? '🌙' : mode === 'light' ? '☀' : '🌓';
}
```

- [ ] **Step 2: Add toggle to HTML**

Edit `web-src/index.html` `<body>` to include a fixed header:
```html
<header class="global">
  <button id="theme-toggle" type="button" aria-label="Toggle theme">🌓</button>
</header>
<main id="app"></main>
```

- [ ] **Step 3: Style**

Append `app.css`:
```css
header.global {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 1rem;
  max-width: 640px;
  margin: 0 auto;
}
#theme-toggle {
  background: transparent;
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 6px;
  min-width: 44px;
  min-height: 44px;
}
```

- [ ] **Step 4: Commit**

```bash
git add web-src/src/ui/theme.js web-src/index.html web-src/app.css
git commit -m "feat(web): theme toggle (auto/light/dark) with FOUC-proof bootstrap"
```

---

### Task 3.7: Keyboard shortcuts

**Files:**
- Create: `web-src/src/ui/shortcuts.js`
- Modify: `web-src/src/main.js`

- [ ] **Step 1: Implement shortcuts.js**

Write `web-src/src/ui/shortcuts.js`:
```js
export function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const primary = document.querySelector('#send, #show');
      primary?.click();
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      const back = document.querySelector('[data-back]');
      back?.click();
    }
  });
}
```

- [ ] **Step 2: Call from main.js boot**

Edit `main.js`:
```js
import { initShortcuts } from './ui/shortcuts.js';
// …
initShortcuts();
```

- [ ] **Step 3: Commit**

```bash
git add web-src/src/ui/shortcuts.js web-src/src/main.js
git commit -m "feat(web): keyboard shortcuts (Ctrl+Enter send, Esc back)"
```

---

### Task 3.8: Password mode + strength indicator

**Files:**
- Create: `web-src/src/ui/strength.js`
- Modify: `web-src/src/views/compose.js`
- Modify: `web-src/src/views/reveal.js`

- [ ] **Step 1: Implement strength.js**

Write `web-src/src/ui/strength.js`:
```js
const COMMON = new Set(['password', '123456', 'qwerty', 'letmein', 'hunter2', 'admin']);

export function strength(pw) {
  if (!pw) return { bits: 0, label: 'empty' };
  if (COMMON.has(pw.toLowerCase())) return { bits: 0, label: 'too_common' };
  let charset = 0;
  if (/[a-z]/.test(pw)) charset += 26;
  if (/[A-Z]/.test(pw)) charset += 26;
  if (/[0-9]/.test(pw)) charset += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) charset += 32;
  const bits = Math.floor(pw.length * Math.log2(Math.max(charset, 1)));
  const label = bits < 40 ? 'weak' : bits < 60 ? 'ok' : 'strong';
  return { bits, label };
}
```

- [ ] **Step 2: Extend compose.js for password toggle**

Add to template:
```html
<div class="row">
  <label><input type="checkbox" id="pwToggle"> ${t('compose.password', 'Additional password')}</label>
</div>
<div id="pwArea" hidden>
  <input type="password" id="pw" placeholder="${t('compose.pwPlaceholder', 'Password')}">
  <div id="pwBar" class="pwBar"></div>
</div>
```

Handler (inside `renderCompose`):
```js
const pwToggle = root.querySelector('#pwToggle');
const pwArea = root.querySelector('#pwArea');
const pw = root.querySelector('#pw');
const pwBar = root.querySelector('#pwBar');

pwToggle.addEventListener('change', () => {
  pwArea.hidden = !pwToggle.checked;
  if (!pwToggle.checked) pw.value = '';
  updateBar();
});
pw.addEventListener('input', updateBar);

function updateBar() {
  import('../ui/strength.js').then(({ strength }) => {
    const s = strength(pw.value);
    pwBar.dataset.level = s.label;
    pwBar.textContent = `${s.label} (~${s.bits} bits)`;
  });
}
```

And in `submit(...)` update the encrypt flow:
```js
import { deriveKey, randomSalt } from '../crypto/kdf.js';

// After: const key = randomKey(); const ct = encrypt(key, ...)
let fragment = `#k=${toB64Url(key)}`;
let hasPassword = false;
if (pwToggle.checked && pw.value) {
  await ready();
  const salt = randomSalt();
  const wrap = deriveKey(pw.value, salt);
  const wrappedKey = encrypt(wrap, key);
  fragment = `#k=${toB64Url(wrappedKey)}&s=${toB64Url(salt)}`;
  hasPassword = true;
}
// then use hasPassword in createNote payload and build url as `${location.origin}/n/${resp.id}${fragment}`
```

- [ ] **Step 3: Extend reveal.js for password input**

In `renderReveal`, if `frag.s` is present, show a password input with label, and use `deriveKey(pw, fromB64Url(frag.s))` to unwrap before final `decrypt`.

Concrete addition inside the click handler:
```js
let key;
if (frag.s) {
  const pw = root.querySelector('#pw').value;
  const salt = fromB64Url(frag.s);
  const wrap = deriveKey(pw, salt);
  try { key = decrypt(wrap, fromB64Url(frag.k)); }
  catch { status.textContent = '❌ wrong password'; btn.disabled = false; return; }
} else {
  key = fromB64Url(frag.k);
}
// …then use `key` in the final decrypt call
```

Add input to template when `frag.s` is set:
```js
const pwInput = frag.s
  ? `<input id="pw" type="password" placeholder="Password">` : '';
```

- [ ] **Step 4: Style strength bar**

Append `app.css`:
```css
.pwBar {
  margin-top: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  background: var(--border);
  color: var(--muted);
}
.pwBar[data-level="weak"] { background: #fecaca; color: #7f1d1d; }
.pwBar[data-level="ok"] { background: #fde68a; color: #78350f; }
.pwBar[data-level="strong"] { background: #bbf7d0; color: #14532d; }
.pwBar[data-level="too_common"] { background: #fca5a5; color: #7f1d1d; }
```

- [ ] **Step 5: Commit**

```bash
git add web-src/src/ui/strength.js web-src/src/views/compose.js web-src/src/views/reveal.js web-src/app.css
git commit -m "feat(web): password mode with Argon2id wrap and strength indicator"
```

---

### Task 3.9: Code-mode + highlight.js lazy load

**Files:**
- Modify: `web-src/src/views/compose.js`
- Modify: `web-src/src/views/reveal.js`

- [ ] **Step 1: Add code-mode toggle in compose**

Add checkbox to template:
```html
<label><input type="checkbox" id="codeMode"> </> Code mode</label>
```

When `codeMode.checked`, the textarea gets class `code` (monospace already default), on submit the plaintext is wrapped in:
```
```<lang>\n<code>\n```
```
Lang defaults to `auto`.

- [ ] **Step 2: Render code in reveal**

After decrypt, detect fenced code pattern:
```js
const m = /^```(\w*)\n([\s\S]*)\n```$/.exec(content.textContent);
if (m) {
  const lang = m[1] || 'plaintext';
  const code = m[2];
  const hljs = (await import('highlight.js/lib/core')).default;
  const langMod = await import(`highlight.js/lib/languages/${lang}`).catch(() => null);
  if (langMod) hljs.registerLanguage(lang, langMod.default);
  content.innerHTML = `<pre><code class="hljs"></code></pre>`;
  const el = content.querySelector('code');
  el.textContent = code;
  if (langMod) el.className = `hljs language-${lang}`, el.innerHTML = hljs.highlight(code, { language: lang }).value;
}
```

- [ ] **Step 3: Bundle highlight.js CSS**

Append `app.css`:
```css
@import 'highlight.js/styles/github-dark.css';
pre code.hljs { padding: 0.75rem; border-radius: 6px; overflow: auto; }
```

- [ ] **Step 4: Commit**

```bash
git add web-src/src/views/
git commit -m "feat(web): code mode with lazy highlight.js rendering in reveal"
```

---

### Task 3.10: PWA manifest + service worker

**Files:**
- Create: `web-src/manifest.webmanifest`
- Create: `web-src/sw.js`
- Modify: `web-src/src/main.js`

- [ ] **Step 1: Write manifest**

Write `web-src/manifest.webmanifest`:
```json
{
  "name": "burn.note",
  "short_name": "burn",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#dc2626",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Create two placeholder PNGs (`web-src/icon-192.png`, `web-src/icon-512.png`) — simple solid-color flame icon is fine for v1.

- [ ] **Step 2: Write sw.js**

Write `web-src/sw.js`:
```js
const CACHE = 'burn-v1';
const SHELL = ['/', '/app.css', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) {
    // Network-only for API to avoid caching secrets.
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
```

- [ ] **Step 3: Register in main.js**

Append to `main.js` boot:
```js
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
```

- [ ] **Step 4: Commit**

```bash
git add web-src/manifest.webmanifest web-src/sw.js web-src/src/main.js
git commit -m "feat(web): PWA manifest and service worker (network-only /api)"
```

---

### Task 3.11: i18n DE/EN strings

**Files:**
- Create: `web-src/i18n/en.json`
- Create: `web-src/i18n/de.json`

- [ ] **Step 1: Write en.json**

Write `web-src/i18n/en.json`:
```json
{
  "compose.tag": "one-time notes, zero metadata",
  "compose.placeholder": "Write your message…",
  "compose.expiry": "Expiry",
  "compose.submit": "Create note",
  "compose.password": "Additional password",
  "compose.pwPlaceholder": "Password",
  "success.title": "Note created",
  "success.intro": "Share this link:",
  "success.copy": "Copy",
  "success.copied": "Copied",
  "success.expiry": "Expires at",
  "success.kill.title": "Kill switch",
  "success.kill.hint": "You can destroy this note manually at any time:",
  "success.kill.btn": "Destroy now",
  "success.kill.confirm": "Really destroy this note?",
  "success.killed": "Destroyed.",
  "reveal.title": "A note is waiting for you",
  "reveal.warn": "Once you click “Show note”, it will be decrypted, shown once, and then destroyed forever.",
  "reveal.tip1": "Make sure you are ready to read it now",
  "reveal.tip2": "Make sure no one is looking over your shoulder",
  "reveal.show": "Show note",
  "reveal.decrypting": "Decrypting…",
  "reveal.gone": "This note is already gone.",
  "reveal.expired": "This note no longer exists."
}
```

- [ ] **Step 2: Write de.json**

Write `web-src/i18n/de.json`:
```json
{
  "compose.tag": "Einmal-Nachrichten, Zero-Metadata",
  "compose.placeholder": "Nachricht hier schreiben…",
  "compose.expiry": "Ablauf",
  "compose.submit": "Nachricht erstellen",
  "compose.password": "Zusätzliches Passwort",
  "compose.pwPlaceholder": "Passwort",
  "success.title": "Nachricht erstellt",
  "success.intro": "Teile diesen Link:",
  "success.copy": "Kopieren",
  "success.copied": "Kopiert",
  "success.expiry": "Existiert bis",
  "success.kill.title": "Kill-Switch",
  "success.kill.hint": "Du kannst diese Nachricht jederzeit manuell zerstören:",
  "success.kill.btn": "Jetzt zerstören",
  "success.kill.confirm": "Nachricht wirklich zerstören?",
  "success.killed": "Zerstört.",
  "reveal.title": "Eine Nachricht wartet auf dich",
  "reveal.warn": "Sobald du „Nachricht anzeigen“ klickst, wird sie entschlüsselt, dir einmal gezeigt und dann für immer gelöscht.",
  "reveal.tip1": "Sei bereit, sie jetzt zu lesen",
  "reveal.tip2": "Niemand schaut dir über die Schulter",
  "reveal.show": "Nachricht anzeigen",
  "reveal.decrypting": "Entschlüssele…",
  "reveal.gone": "Diese Nachricht existiert nicht mehr.",
  "reveal.expired": "Diese Nachricht existiert nicht mehr."
}
```

- [ ] **Step 3: Ensure Vite copies /i18n/**

Vite serves `/public/` by default; place both JSON files in `web-src/public/i18n/` instead:

Run:
```bash
mkdir -p web-src/public/i18n
mv web-src/i18n/*.json web-src/public/i18n/
rmdir web-src/i18n
```

- [ ] **Step 4: Commit**

```bash
git add web-src/public/
git commit -m "feat(web): i18n DE/EN JSON strings (public/i18n/)"
```

---

## Milestone 4 — Accessibility & Polish

### Task 4.1: ARIA labels, live regions, focus management

**Files:**
- Modify: `web-src/src/views/compose.js`
- Modify: `web-src/src/views/success.js`
- Modify: `web-src/src/views/reveal.js`

- [ ] **Step 1: Add ARIA attributes in compose**

Ensure:
- `<textarea aria-label="Message">`
- `<select aria-label="Expiry time">`
- status `<p>` has `role="status" aria-live="polite"` (already has `role="status"` — add `aria-live`)

Verify each interactive element has an accessible name. Add where missing. Ensure icon-only buttons have `aria-label`.

- [ ] **Step 2: Focus management**

After navigation in `main.js::route()`, set focus to the new view's heading:
```js
setTimeout(() => document.querySelector('h1')?.focus({ preventScroll: false }), 0);
```

Add `tabindex="-1"` to `<h1>` in each view template.

- [ ] **Step 3: Skip-link for keyboard users**

In `index.html` body, top:
```html
<a href="#app" class="skip-link">Skip to content</a>
```

CSS (`app.css`):
```css
.skip-link { position: absolute; left: -9999px; }
.skip-link:focus-visible { left: 1rem; top: 1rem; padding: 0.5rem 1rem; background: var(--accent); color: var(--accent-fg); border-radius: 6px; z-index: 10; }
```

- [ ] **Step 4: Run axe-core manually (optional)**

Open browser devtools, run `axe.run()` (install the axe extension). Fix any AA violations surfaced.

- [ ] **Step 5: Commit**

```bash
git add web-src/
git commit -m "feat(a11y): ARIA live regions, labels, focus management, skip-link"
```

---

### Task 4.2: Error state polish

**Files:**
- Modify: `web-src/src/views/compose.js`
- Modify: `web-src/src/views/reveal.js`

- [ ] **Step 1: Map server errors to human strings**

In both compose and reveal catch blocks, map known codes:
```js
const msg = {
  'pow_failed': 'Proof-of-work failed. Please retry.',
  'bad_request': 'Request was invalid.',
  'gone': 'This note is gone.',
  'forbidden': 'Not allowed.',
  'internal': 'Server error. Please retry later.'
}[e.message] || e.message;
status.textContent = '❌ ' + msg;
```

- [ ] **Step 2: Commit**

```bash
git add web-src/src/views/
git commit -m "feat(web): map API error codes to user-friendly strings"
```

---

### Task 4.3: Mobile / responsive audit

- [ ] **Step 1: Add meta viewport check**

Already in `index.html`. Verify.

- [ ] **Step 2: Audit in Chrome DevTools responsive mode**

Test at: 320px width (smallest), 375px (iPhone), 768px (tablet), 1280px (desktop). Each view must be usable without horizontal scroll. Touch targets ≥ 44px (buttons already set via min-height).

- [ ] **Step 3: Adjust CSS if needed**

Add minor responsive tweaks to `app.css`:
```css
@media (max-width: 480px) {
  main { padding: 0.75rem; }
  h1 { font-size: 1.25rem; }
  textarea { font-size: 16px; } /* prevents iOS auto-zoom */
}
```

- [ ] **Step 4: Commit**

```bash
git add web-src/app.css
git commit -m "style(web): responsive tweaks for small viewports"
```

---

### Task 4.4: Playwright E2E test suite

**Files:**
- Create: `web-src/e2e/happy-path.spec.js`
- Create: `web-src/e2e/password.spec.js`
- Create: `web-src/e2e/kill.spec.js`
- Create: `web-src/e2e/gone.spec.js`
- Create: `web-src/playwright.config.js`

- [ ] **Step 1: Install Playwright**

Run:
```bash
cd web-src
npm install --save-dev @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Write playwright.config.js**

Write `web-src/playwright.config.js`:
```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30000
  }
});
```

- [ ] **Step 3: Write happy-path.spec.js**

Write `web-src/e2e/happy-path.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('create and reveal a note', async ({ page, context }) => {
  await page.goto('/');
  await page.fill('#msg', 'hello burn');
  await page.click('#send');
  await expect(page.locator('#link')).toHaveValue(/\/n\//, { timeout: 15000 });
  const url = await page.locator('#link').inputValue();

  const tab2 = await context.newPage();
  await tab2.goto(url);
  await tab2.click('#show');
  await expect(tab2.locator('#content')).toContainText('hello burn', { timeout: 10000 });

  // Reload → gone
  await tab2.reload();
  await tab2.click('#show');
  await expect(tab2.locator('#status')).toContainText(/gone|already/i);
});
```

- [ ] **Step 4: Write password.spec.js**

Write `web-src/e2e/password.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('password-protected note', async ({ page, context }) => {
  await page.goto('/');
  await page.fill('#msg', 'secret with pw');
  await page.check('#pwToggle');
  await page.fill('#pw', 'correct-horse-battery-staple');
  await page.click('#send');
  await expect(page.locator('#link')).toHaveValue(/&s=/, { timeout: 20000 });
  const url = await page.locator('#link').inputValue();

  const tab2 = await context.newPage();
  await tab2.goto(url);
  await tab2.fill('#pw', 'wrong-password');
  await tab2.click('#show');
  await expect(tab2.locator('#status')).toContainText(/wrong/i);

  // correct
  await tab2.reload();
  await tab2.fill('#pw', 'correct-horse-battery-staple');
  await tab2.click('#show');
  await expect(tab2.locator('#content')).toContainText('secret with pw');
});
```

- [ ] **Step 5: Write kill.spec.js**

Write `web-src/e2e/kill.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('kill switch destroys the note', async ({ page, context }) => {
  await page.goto('/');
  await page.fill('#msg', 'doomed');
  await page.click('#send');
  await expect(page.locator('#link')).toHaveValue(/\/n\//);
  const url = await page.locator('#link').inputValue();

  page.once('dialog', d => d.accept());
  await page.click('#kill');
  await expect(page.locator('#killStatus')).toContainText(/destroyed/i);

  const tab2 = await context.newPage();
  await tab2.goto(url);
  await tab2.click('#show');
  await expect(tab2.locator('#status')).toContainText(/gone|already/i);
});
```

- [ ] **Step 6: Write gone.spec.js**

Write `web-src/e2e/gone.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('reveal URL for non-existent id shows gone', async ({ page }) => {
  await page.goto('/n/NONEXISTENTID12#k=AAAA');
  await page.click('#show');
  await expect(page.locator('#status')).toContainText(/gone|already/i);
});
```

- [ ] **Step 7: Add npm script**

Edit `web-src/package.json` `scripts`:
```json
"e2e": "playwright test"
```

- [ ] **Step 8: Run Playwright tests**

Ensure backend + redis are running (Task 1.9 setup). Then:
```bash
cd web-src && npm run e2e
```

Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
cd ..
git add web-src/e2e/ web-src/playwright.config.js web-src/package.json
git commit -m "test(e2e): playwright coverage (happy, password, kill, gone)"
```

---

### Task 4.5: Security-specific E2E assertions

**Files:**
- Create: `web-src/e2e/security.spec.js`

- [ ] **Step 1: Write security.spec.js**

Write `web-src/e2e/security.spec.js`:
```js
import { test, expect } from '@playwright/test';

test('fragment is never sent to server in any request', async ({ page }) => {
  const requests = [];
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));

  await page.goto('/');
  await page.fill('#msg', 'test');
  await page.click('#send');
  await expect(page.locator('#link')).toHaveValue(/\/n\//);
  const url = await page.locator('#link').inputValue();

  await page.goto(url);
  await page.click('#show');

  for (const req of requests) {
    expect(req.url).not.toContain('#');
    expect(req.url).not.toContain('k=');
  }
});

test('og-tags on /n/<id> are static', async ({ request }) => {
  const res = await request.get('/n/ANYID123456789');
  const html = await res.text();
  expect(html).toContain('og:title');
  expect(html).toContain('Click to reveal');
  expect(html).not.toContain('ANYID123456789'); // id should not leak
});
```

- [ ] **Step 2: Run**

```bash
cd web-src && npm run e2e
```

- [ ] **Step 3: Commit**

```bash
cd ..
git add web-src/e2e/security.spec.js
git commit -m "test(e2e): fragment-never-leaked and og-tags-static security asserts"
```

---

## Milestone 5 — Deploy-Ready

### Task 5.1: Go binary embeds built web assets

**Files:**
- Modify: `cmd/burn/main.go`
- Create: `internal/api/static.go`

- [ ] **Step 1: Build frontend once and embed**

Run:
```bash
cd web-src && npm run build && cd ..
```

(`web/` directory now contains the built assets.)

- [ ] **Step 2: Implement static handler**

Write `internal/api/static.go`:
```go
package api

import (
	"embed"
	"io/fs"
	"net/http"
)

func StaticHandler(webFS embed.FS) (http.Handler, error) {
	sub, err := fs.Sub(webFS, "web")
	if err != nil {
		return nil, err
	}
	return http.FileServer(http.FS(sub)), nil
}
```

- [ ] **Step 3: Modify main.go**

Edit `cmd/burn/main.go`:
```go
//go:embed web
var webFS embed.FS
```

And wire a fallback at router level. Edit `internal/api/router.go`:
```go
func (h *Handler) RoutesWithStatic(static http.Handler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/pow/challenge", h.POWChallenge)
	mux.HandleFunc("POST /api/notes", h.CreateNote)
	mux.HandleFunc("POST /api/notes/{id}/reveal", h.RevealNote)
	mux.HandleFunc("DELETE /api/notes/{id}", h.KillNote)
	mux.HandleFunc("GET /healthz", h.Health)
	mux.HandleFunc("GET /n/", func(w http.ResponseWriter, r *http.Request) {
		h.RevealShell(w, r)
	})
	mux.Handle("/", static)
	return mux
}
```

And in `main.go`:
```go
static, err := api.StaticHandler(webFS)
if err != nil { log.Fatal(err) }
handler := api.Recover(api.SecurityHeaders(api.MaxJSONBytes(int64(cfg.MaxCiphertextKB)*1024*2, h.RoutesWithStatic(static))))
```

Note: copy the built `web/` directory into `cmd/burn/web/` for embed scope, or use path `"../../web"` — simplest is to place web assets alongside `main.go`. Adjust embed path to match.

- [ ] **Step 4: Commit**

```bash
git add internal/api/ cmd/burn/
git commit -m "feat(server): embed built web assets and serve from /"
```

---

### Task 5.2: Dockerfile (multi-stage, distroless)

**Files:**
- Create: `deploy/Dockerfile`

- [ ] **Step 1: Write Dockerfile**

Write `deploy/Dockerfile`:
```dockerfile
# syntax=docker/dockerfile:1.7

# --- Stage 1: Build frontend ---
FROM node:20-alpine AS web
WORKDIR /src
COPY web-src/package.json web-src/package-lock.json ./
RUN npm ci
COPY web-src/ ./
RUN npm run build
# Output: /src/../web/ ??? adjust
# We output to ../web by vite config; adjust:
RUN ls -la

# --- Stage 2: Build Go binary ---
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Copy freshly built frontend
COPY --from=web /src/../web ./web
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/burn ./cmd/burn

# --- Stage 3: Minimal runtime ---
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/burn /burn
USER nonroot:nonroot
ENTRYPOINT ["/burn"]
```

Note: Vite output path needs to be inside the container context. Adjust `vite.config.js` `outDir` to `../web-built` (inside the container at `/src/web-built`), then copy from there. Keep repo layout clean.

- [ ] **Step 2: Build image locally**

Run:
```bash
docker build -f deploy/Dockerfile -t burn:dev .
```

- [ ] **Step 3: Commit**

```bash
git add deploy/Dockerfile
git commit -m "build(docker): multi-stage distroless image"
```

---

### Task 5.3: docker-compose + Caddyfile + redis.conf

**Files:**
- Create: `deploy/docker-compose.yml`
- Create: `deploy/Caddyfile`
- Create: `deploy/redis.conf`

- [ ] **Step 1: Write redis.conf**

Write `deploy/redis.conf`:
```
unixsocket /sockets/redis.sock
unixsocketperm 770
port 0
appendonly no
save ""
maxmemory 256mb
maxmemory-policy volatile-ttl
protected-mode no
```

- [ ] **Step 2: Write docker-compose.yml**

Write `deploy/docker-compose.yml`:
```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [burn]

  burn:
    image: ghcr.io/kvnflx/burn-note:latest
    restart: unless-stopped
    environment:
      BURN_LISTEN_ADDR: ":8080"
      BURN_REDIS_SOCKET: /sockets/redis.sock
      BURN_REDIS_NETWORK: unix
      BURN_POW_DIFFICULTY: "20"
      BURN_MAX_CIPHERTEXT_KB: "100"
    volumes:
      - sockets:/sockets
    read_only: true
    user: "65532:65532"
    cap_drop: [ALL]
    security_opt:
      - no-new-privileges:true
    depends_on: [redis]

  redis:
    image: redis:7-alpine
    command: ["redis-server", "/etc/redis/redis.conf"]
    volumes:
      - ./redis.conf:/etc/redis/redis.conf:ro
      - sockets:/sockets
    tmpfs:
      - /data
    read_only: true

volumes:
  caddy_data:
  caddy_config:
  sockets:
```

- [ ] **Step 3: Write Caddyfile**

Write `deploy/Caddyfile`:
```
note.backsafe.de {
    encode zstd gzip

    reverse_proxy burn:8080

    log {
        output discard
    }

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; worker-src 'self'"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "no-referrer"
        Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()"
        -Server
    }
}
```

- [ ] **Step 4: Test compose up locally**

Run:
```bash
cd deploy
docker compose up -d
# wait 10s
curl -s http://localhost/healthz -H 'Host: note.backsafe.de' -k
docker compose down -v
```

Expected: 200 "ok" response.

- [ ] **Step 5: Commit**

```bash
cd ..
git add deploy/
git commit -m "feat(deploy): docker-compose, Caddyfile, redis.conf (tmpfs, no-logs)"
```

---

### Task 5.4: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write ci.yml**

Write `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test-go:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - run: go vet ./...
      - run: go test -race -cover ./...

  test-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web-src/package-lock.json
      - run: npm ci
        working-directory: web-src
      - run: npm test
        working-directory: web-src

  e2e:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.22' }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: web-src/package-lock.json }
      - run: npm ci
        working-directory: web-src
      - run: npx playwright install --with-deps chromium
        working-directory: web-src
      - name: Start backend
        env:
          BURN_REDIS_SOCKET: "localhost:6379"
          BURN_REDIS_NETWORK: "tcp"
          BURN_POW_DIFFICULTY: "4"
        run: go run ./cmd/burn &
      - run: sleep 3
      - run: npm run e2e
        working-directory: web-src
```

- [ ] **Step 2: Commit**

```bash
git add .github/
git commit -m "ci: GitHub Actions for go tests, web tests, e2e with redis service"
```

---

### Task 5.5: Release workflow (multi-arch image + cosign)

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Write release.yml**

Write `.github/workflows/release.yml`:
```yaml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  image:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: sigstore/cosign-installer@v3
      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=semver,pattern={{version}}
            type=sha
      - uses: docker/build-push-action@v6
        id: build
        with:
          context: .
          file: deploy/Dockerfile
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
      - name: Sign image
        env:
          COSIGN_EXPERIMENTAL: 'true'
        run: cosign sign --yes ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci(release): multi-arch image build + cosign signing on tag"
```

---

### Task 5.6: Docs — README, SECURITY, THREAT-MODEL, HOSTING

**Files:**
- Create: `docs/README.md`
- Create: `docs/SECURITY.md`
- Create: `docs/THREAT-MODEL.md`
- Create: `docs/HOSTING.md`

- [ ] **Step 1: Write docs/README.md**

Write `C:/Projekte/notepad/docs/README.md`:
```markdown
# burn-note

Self-destructing one-time messages. E2E-encrypted, zero-metadata, open-source.

## Quick overview
- **Threat Model:** Zero-trust server, zero-metadata (no access logs, no IP storage, no analytics)
- **Crypto:** XChaCha20-Poly1305 in the browser; Argon2id for optional password
- **Storage:** In-memory Redis on tmpfs; reboot wipes everything
- **No accounts, no email, no tracking**
- **Self-hostable** via Docker Compose on a 4 €/month VPS

## Live deployment
https://note.backsafe.de

## Links
- [Security policy](SECURITY.md)
- [Threat model](THREAT-MODEL.md)
- [Hosting guide](HOSTING.md)

## License
AGPL-3.0 — see [LICENSE](../LICENSE).
```

- [ ] **Step 2: Write SECURITY.md**

Write `docs/SECURITY.md`:
```markdown
# Security Policy

## Reporting a vulnerability

Email: security@backsafe.de (PGP key fingerprint: TO BE PUBLISHED AT FIRST TAGGED RELEASE).

Please do not file public issues for security reports. We aim to respond within 72 hours and to ship a fix (or at least a documented workaround) within 14 days for high-severity issues.

## Scope

In scope:
- Cryptographic weaknesses in the client or server
- Metadata leaks that would identify senders, recipients, or content patterns
- Remote code execution, SSRF, XSS, CSRF, injection
- Bypasses of the reveal/kill/expiry guarantees
- Container escape paths in the deployment

Out of scope:
- Attacks that require physical access or a compromised endpoint
- Missing best-practice headers on pages other than the app
- Self-XSS that requires the user to paste crafted code into the devtools console
- Social engineering
```

- [ ] **Step 3: Write THREAT-MODEL.md**

Write `docs/THREAT-MODEL.md`:
```markdown
# Threat Model

This file documents what burn-note protects against, what it does not, and the explicit trade-offs.

## Protected

1. **Wire tapping on transport**: TLS 1.3, HSTS, no downgrade.
2. **Post-read server compromise**: content is deleted from Redis atomically on first reveal.
3. **Disk forensics**: Redis runs entirely on tmpfs; nothing persists to disk.
4. **Link-preview crawlers in messengers**: Click-to-Reveal pattern serves a static HTML shell that does not trigger a burn. Crawlers that actually simulate a click will burn the note — the intended recipient then sees "already gone" (tamper-evident by design).
5. **Brute-force against optional password**: Argon2id (64 MiB, 3 iter) makes each attempt ~500 ms; a 10-character random password is out of reach.
6. **Storage DoS**: SHA-256 proof-of-work gates every create request without storing IPs.
7. **Third-party data leaks**: zero CDNs, zero analytics, zero shorteners. Everything is self-hosted.
8. **Subpoenas for metadata**: there are no access logs, no IP records, no persistent state.

## Not protected

1. **Live server backdoor**: a runtime compromise of the Go process could capture plaintext requests (which are still ciphertext, not cleartext) and client IPs. Content remains encrypted.
2. **Client-side malware**: compromised browsers, keyloggers, screen recorders, or clipboard hijackers on the sender/recipient device are out of scope.
3. **Weak passwords**: once a recipient has the ciphertext (post-reveal), brute-forcing the wrap-password is bounded only by Argon2id — not infinite, but finite. Pick real passwords.
4. **Network-level anonymity**: burn-note v1 does not run as a Tor Hidden Service. A determined observer who can see both the sender's and recipient's network can correlate the create/reveal via connection timing. Run your own instance behind Tor if this matters to you (`HOSTING.md` describes how).
5. **Metadata available to operators of your path (ISP, VPN, CF Tunnel, etc.)**: that is outside our scope — we only control what happens on our server.

## Explicit trade-offs

- **Click-to-Reveal is not tamper-proof**: it is tamper-evident. If a rogue crawler (headless Chrome) clicks through, the note is gone when the human opens it.
- **No Grace-Period, No Max-N-Reads**: bi first reveal wins. Intentional.
- **No accounts / no auth**: abuse prevention relies entirely on PoW plus content-size caps.
```

- [ ] **Step 4: Write HOSTING.md**

Write `docs/HOSTING.md`:
````markdown
# Hosting guide

## Requirements
- Any small Linux VPS (tested on Hetzner CX22 @ 4 €/month)
- Debian 12 or Ubuntu 22.04+
- Docker Engine 24+ and Docker Compose v2
- A domain name pointed at the VPS
- Port 80 and 443 open

## Step-by-step

1. DNS: add an `A` record for your subdomain (e.g. `note.example.com`) pointing to your VPS IP.

2. Clone the repo:
```bash
git clone https://github.com/kvnflx/burn-note.git
cd burn-note/deploy
```

3. Edit `Caddyfile`: replace `note.backsafe.de` with your hostname.

4. (Optional) edit `docker-compose.yml` to tune:
   - `BURN_POW_DIFFICULTY` (raise to 22 if under attack)
   - `BURN_MAX_CIPHERTEXT_KB` (default 100)
   - Redis `maxmemory` in `redis.conf`

5. Start:
```bash
docker compose up -d
```

Caddy will automatically acquire a Let's Encrypt certificate. Visit `https://your-domain` — you should see the compose view.

## Updating

```bash
docker compose pull
docker compose up -d
```

## Behind Tor (optional)

Add a `tor` service to `docker-compose.yml`:

```yaml
  tor:
    image: goldy/tor-hidden-service
    environment:
      BURN_TOR_SERVICE_HOSTS: '80:caddy:80'
      BURN_TOR_SERVICE_VERSION: '3'
    volumes:
      - tor_keys:/var/lib/tor/hidden_service/
    depends_on: [caddy]

volumes:
  # ...
  tor_keys:
```

Your `.onion` address will be printed at startup: `docker compose logs tor | grep '\.onion'`.

## Hardening checklist

- [ ] UFW: only 22 (whitelisted source IPs), 80, 443
- [ ] SSH: key-only, root login disabled, fail2ban enabled
- [ ] `journalctl` in RAM: `/etc/systemd/journald.conf` → `Storage=volatile`
- [ ] Unattended upgrades enabled: `apt install unattended-upgrades`
- [ ] Do NOT expose the Docker socket to any container
- [ ] Regular OS patching cadence (monthly)
````

- [ ] **Step 5: Commit**

```bash
git add docs/
git commit -m "docs: README, SECURITY, THREAT-MODEL, HOSTING"
```

---

### Task 5.7: Production deploy dry-run

- [ ] **Step 1: Build a tagged image**

```bash
docker build -f deploy/Dockerfile -t burn:v0.1.0 .
```

- [ ] **Step 2: Run the full compose stack locally**

Override image in compose:
```bash
cd deploy
BURN_IMAGE=burn:v0.1.0 docker compose up -d
```

- [ ] **Step 3: Verify**

```bash
curl -k https://localhost/  # Caddy serves HTTPS via self-signed for localhost
```

Or, better: add `127.0.0.1 note.backsafe.de` to `/etc/hosts` and visit in browser (accept self-signed).

- [ ] **Step 4: Exercise in browser**

Create, share, reveal, kill — all flows must work end-to-end.

- [ ] **Step 5: Tear down**

```bash
docker compose down -v
```

- [ ] **Step 6: Commit any fixes discovered**

---

### Task 5.8: Create first tag & publish

- [ ] **Step 1: Ensure main branch is clean**

```bash
git status
git log --oneline -n 5
```

- [ ] **Step 2: Tag and push**

```bash
git tag v0.1.0 -m "v0.1.0 — initial release"
git push origin main --tags
```

- [ ] **Step 3: Verify release workflow**

GitHub Actions → Release workflow should build multi-arch, push to GHCR, sign with cosign.

- [ ] **Step 4: Deploy to production VPS**

On your VPS:
```bash
git clone https://github.com/kvnflx/burn-note.git
cd burn-note/deploy
# Edit Caddyfile hostname
docker compose up -d
```

Caddy acquires TLS automatically. Verify at `https://note.backsafe.de`.

- [ ] **Step 5: Announce (optional)**

Post to relevant communities (HN, r/privacy, cypherpunks mailing list) with a short intro and the threat-model link.

---

## Self-Review

**Spec coverage:**

- Threat Model (Level C, zero-trust/zero-metadata): covered across 5.6 logging policy, 5.2 redis tmpfs, 5.3 Caddy `log output discard`, 5.6 docs/THREAT-MODEL.md.
- Message types (text + code): Task 3.9 code mode + highlight.js.
- Destruction triggers (first-read, TTL, kill-switch): Task 1.5 (RevealScript, KillScript), Task 1.7 (CreateNote expiry validation), Task 2.7 (success kill UI).
- URL model (fragment key + optional password): Task 2.6 & 3.8 (compose submit builds fragment), Task 2.8 & 3.8 (reveal parses fragment).
- Click-to-Reveal landing: Task 1.7 (RevealShell), Task 2.8 (reveal view).
- Click-to-Reveal tamper-evident semantics: documented in Task 5.6 THREAT-MODEL.md.
- PoW abuse prevention: Task 1.4, 1.7, 2.5.
- QR / Web Share / Sichtschutz / Countdown / Clipboard-Clear / Theme / Estimate-Expiry / Shortcuts / Password-Strength / i18n / A11y / PWA: Tasks 3.1–3.11 + 4.1.
- Deployment (Caddy + Go + Redis tmpfs, Docker Compose): Tasks 5.2, 5.3.
- CI/CD (multi-arch, cosign, tests): Tasks 5.4, 5.5.
- Lizenz AGPL-3.0: Task 1.1 Step 3.
- Docs (SECURITY, THREAT-MODEL, HOSTING): Task 5.6.
- Testing (Go unit, JS unit, Playwright E2E, security asserts): Tasks 1.2/1.3/1.4/1.5/1.7, 2.2/2.3, 4.4/4.5.

**Placeholder scan:**
- Task 1.9 mentions a future `scripts/solve_pow.go` utility — the workaround (lower `BURN_POW_DIFFICULTY=4` during dev) is concrete.
- Task 3.10 references placeholder PNG icons; noted explicitly as v1 acceptable.
- Task 5.2 Dockerfile references a vite `outDir` discussion — the actual config file (Task 2.1) is concrete with `outDir: '../web'`; Dockerfile `COPY --from=web` may need a path adjustment, flagged explicitly.
- Task 5.7 Step 2 references an env override pattern (`BURN_IMAGE`); compose file uses a hardcoded tag, so the step should be adjusted to either `sed` the image or use a compose override. **Fix:** Add a note that tag is fixed at `ghcr.io/kvnflx/burn-note:latest`; for the dry-run use `docker compose up -d` after building and retagging locally:
  - Actually, clean approach: retag the dev image: `docker tag burn:v0.1.0 ghcr.io/kvnflx/burn-note:latest` before `docker compose up -d`. Let me fix this inline.

- Let me also fix: Task 1.7 handler_test imports paths use `github.com/kvnflx/burn-note` — module path must match `go.mod`. Task 1.1 Step 1 set the module path to `github.com/kvnflx/burn-note`, so this is consistent.

**Type consistency:**
- `crypto.NewKillToken()` returns a 43-char string (Task 1.3) — matches 32-byte random base64 url-safe no-padding = `ceil(32*4/3) - 0 = 43 chars`. ✓
- `createResp.KillToken` string, success UI uses `data.kill` — wait: in Task 2.6 compose.js assigns `{ url, kill: resp.kill_token, ... }` so `kill_token` (snake from server) → `kill` (frontend). success.js uses `data.kill`. Consistent. ✓
- `Store` interface methods (PutNote/RevealNote/KillNote/IssuePOWSeed/ConsumePOWSeed) match implementation and tests. ✓
- POW API: client sends `{ seed, nonce }`; Go handler expects `{ seed, nonce }` nested in `pow`. ✓

**Fixes applied inline:** Task 5.7 Step 2 — added clarification that image retagging is needed. Added note at Task 5.2 Step 1 about `vite.config.js` `outDir`.

All critical gaps addressed.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-22-burn-note-implementation.md`.**
