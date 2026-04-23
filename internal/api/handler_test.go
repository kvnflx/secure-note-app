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
	"github.com/fynnsh/burn-note/internal/config"
	"github.com/fynnsh/burn-note/internal/pow"
	"github.com/fynnsh/burn-note/internal/storage"
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
