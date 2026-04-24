// Package api implements the burn-note HTTP interface.
package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/kvnflx/secure-note-app/internal/config"
	"github.com/kvnflx/secure-note-app/internal/crypto"
	"github.com/kvnflx/secure-note-app/internal/pow"
	"github.com/kvnflx/secure-note-app/internal/storage"
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
	Ciphertext  string `json:"ciphertext"` // standard base64 with padding
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
	id := r.PathValue("id")
	n, err := h.Store.RevealNote(r.Context(), id)
	if errors.Is(err, storage.ErrNotFound) {
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
	id := r.PathValue("id")
	var req killReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.KillToken == "" {
		h.writeErr(w, 400, "bad_request", "")
		return
	}
	err := h.Store.KillNote(r.Context(), id, crypto.HashToken(req.KillToken))
	if errors.Is(err, storage.ErrNotFound) {
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
