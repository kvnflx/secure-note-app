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

	"github.com/fynnsh/burn-note/internal/api"
	"github.com/fynnsh/burn-note/internal/config"
	"github.com/fynnsh/burn-note/internal/storage"
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
		Network: cfg.RedisNetwork,
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
