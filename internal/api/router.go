package api

import (
	"net/http"
	"strings"
)

// spaRoutes lists additional client-rendered paths that must be served
// with the HTML shell (so a reload or direct link works).
var spaRoutes = map[string]struct{}{
	"/use-cases":    {},
	"/how-it-works": {},
	"/imprint":      {},
	"/privacy":      {},
	"/success":      {},
}

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

// RoutesWithStatic serves API, the reveal shell, SPA pages, and falls back
// to the static file server (Vite-built index.html, assets) for the root
// and everything else.
func (h *Handler) RoutesWithStatic(static http.Handler, spaShell []byte) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/pow/challenge", h.POWChallenge)
	mux.HandleFunc("POST /api/notes", h.CreateNote)
	mux.HandleFunc("POST /api/notes/{id}/reveal", h.RevealNote)
	mux.HandleFunc("DELETE /api/notes/{id}", h.KillNote)
	mux.HandleFunc("GET /healthz", h.Health)

	mux.HandleFunc("GET /n/", func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/n/")
		if id == "" || strings.ContainsAny(id, "/?#") {
			http.NotFound(w, r)
			return
		}
		h.RevealShell(w, r)
	})

	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if _, ok := spaRoutes[r.URL.Path]; ok {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Header().Set("Cache-Control", "no-cache")
			_, _ = w.Write(spaShell)
			return
		}
		static.ServeHTTP(w, r)
	})
	return mux
}
