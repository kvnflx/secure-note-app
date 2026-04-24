package main

import (
	"context"
	"embed"
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

//go:embed all:web-assets
var webFS embed.FS

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	store, err := storage.NewRedis(storage.RedisConfig{
		Addr:    cfg.RedisSocket,
		Network: cfg.RedisNetwork,
	})
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	defer store.Close()

	spaShell, err := api.SPAShellBytes(webFS)
	if err != nil {
		log.Fatalf("spa shell: %v", err)
	}
	h := api.New(cfg, store, spaShell)
	static, err := api.StaticHandler(webFS)
	if err != nil {
		log.Fatalf("static: %v", err)
	}
	handler := api.Recover(api.SecurityHeaders(api.MaxJSONBytes(int64(cfg.MaxCiphertextKB)*1024*2, h.RoutesWithStatic(static, spaShell))))

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
