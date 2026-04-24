package api

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/kvnflx/secure-note-app/internal/config"
	"github.com/kvnflx/secure-note-app/internal/pow"
	"github.com/kvnflx/secure-note-app/internal/storage"
)

// TestIntegrationHappyPath spins up the real HTTP stack (middleware + router + handlers)
// backed by miniredis, and walks the full create → reveal → gone flow via real HTTP.
func TestIntegrationHappyPath(t *testing.T) {
	mr := miniredis.RunT(t)
	s, err := storage.NewRedis(storage.RedisConfig{Addr: mr.Addr()})
	if err != nil {
		t.Fatal(err)
	}
	cfg := &config.Config{
		ListenAddr:      ":0",
		RedisSocket:     mr.Addr(),
		RedisNetwork:    "tcp",
		MaxCiphertextKB: 100,
		POWDifficulty:   4,
		POWSeedTTLSec:   300,
		ExpiryOptions:   []int{60, 3600},
		MaxExpirySec:    2592000,
	}
	h := New(cfg, s, []byte("<html>shell</html>"))
	handler := Recover(SecurityHeaders(MaxJSONBytes(int64(cfg.MaxCiphertextKB)*1024*2, h.Routes())))

	srv := httptest.NewServer(handler)
	defer srv.Close()

	// 1. Fetch PoW challenge
	challenge, err := http.Get(srv.URL + "/api/pow/challenge")
	if err != nil {
		t.Fatal(err)
	}
	defer challenge.Body.Close()
	if challenge.StatusCode != 200 {
		t.Fatalf("challenge status %d", challenge.StatusCode)
	}
	var powResp map[string]interface{}
	json.NewDecoder(challenge.Body).Decode(&powResp)
	seed := powResp["seed"].(string)
	diff := int(powResp["difficulty"].(float64))

	// 2. Solve PoW (brute-force, difficulty is 4)
	var nonce string
	for i := 0; i < 1<<24; i++ {
		nonce = strconv.Itoa(i)
		if pow.Verify(seed, nonce, diff) {
			break
		}
	}

	// 3. Create note
	body := map[string]interface{}{
		"ciphertext":   base64.StdEncoding.EncodeToString([]byte("integration hello")),
		"expires_in":   60,
		"has_password": false,
		"pow":          map[string]string{"seed": seed, "nonce": nonce},
	}
	b, _ := json.Marshal(body)
	resp, err := http.Post(srv.URL+"/api/notes", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 201 {
		buf, _ := io.ReadAll(resp.Body)
		t.Fatalf("create status %d: %s", resp.StatusCode, string(buf))
	}
	var cr createResp
	json.NewDecoder(resp.Body).Decode(&cr)
	resp.Body.Close()
	if cr.ID == "" || cr.KillToken == "" {
		t.Fatal("missing id/token")
	}

	// 4. Reveal note
	req, _ := http.NewRequest("POST", srv.URL+"/api/notes/"+cr.ID+"/reveal", nil)
	revealResp2, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	if revealResp2.StatusCode != 200 {
		buf, _ := io.ReadAll(revealResp2.Body)
		t.Fatalf("reveal status %d: %s", revealResp2.StatusCode, string(buf))
	}
	var rr revealResp
	json.NewDecoder(revealResp2.Body).Decode(&rr)
	revealResp2.Body.Close()
	pt, _ := base64.StdEncoding.DecodeString(rr.Ciphertext)
	if string(pt) != "integration hello" {
		t.Errorf("payload mismatch: got %q", string(pt))
	}

	// 5. Second reveal must be 404
	req2, _ := http.NewRequest("POST", srv.URL+"/api/notes/"+cr.ID+"/reveal", nil)
	gone, err := http.DefaultClient.Do(req2)
	if err != nil {
		t.Fatal(err)
	}
	defer gone.Body.Close()
	if gone.StatusCode != 404 {
		t.Errorf("second reveal: want 404, got %d", gone.StatusCode)
	}

	// 6. Check security headers were applied (middleware is wired correctly)
	probe, err := http.Get(srv.URL + "/healthz")
	if err != nil {
		t.Fatal(err)
	}
	defer probe.Body.Close()
	if probe.Header.Get("X-Content-Type-Options") != "nosniff" {
		t.Error("X-Content-Type-Options header missing (middleware not wired)")
	}
	if probe.Header.Get("Referrer-Policy") != "no-referrer" {
		t.Error("Referrer-Policy header missing (middleware not wired)")
	}
}

// TestIntegrationRevealShell confirms the static HTML shell is served for /n/<id>.
func TestIntegrationRevealShell(t *testing.T) {
	mr := miniredis.RunT(t)
	s, err := storage.NewRedis(storage.RedisConfig{Addr: mr.Addr()})
	if err != nil {
		t.Fatal(err)
	}
	cfg := &config.Config{
		ListenAddr: ":0", RedisSocket: mr.Addr(), RedisNetwork: "tcp",
		MaxCiphertextKB: 100, POWDifficulty: 4, POWSeedTTLSec: 300,
		ExpiryOptions: []int{60, 3600}, MaxExpirySec: 2592000,
	}
	h := New(cfg, s, []byte("<html>SHELL_MARKER</html>"))
	handler := Recover(SecurityHeaders(MaxJSONBytes(int64(cfg.MaxCiphertextKB)*1024*2, h.Routes())))
	srv := httptest.NewServer(handler)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/n/TESTID12")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("shell status %d", resp.StatusCode)
	}
	buf, _ := io.ReadAll(resp.Body)
	if !bytes.Contains(buf, []byte("SHELL_MARKER")) {
		t.Error("shell content not returned")
	}
	if resp.Header.Get("Content-Type") == "" || resp.Header.Get("Cache-Control") != "no-store" {
		t.Error("shell headers missing")
	}
}
