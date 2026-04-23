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
