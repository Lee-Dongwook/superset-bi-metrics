package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/config"
	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/handler"
	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/ws"
)

func main() {
	cfg := config.LoadConfig()

	hub := ws.NewHub()
	go hub.Run()

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", handler.HealthCheckHandler())
	mux.HandleFunc("/ws", handler.WebSocketHandler(hub, cfg.AllowedOrigins))

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	// Server run context for graceful shutdown
	serverCtx, serverStopCtx := context.WithCancel(context.Background())

	// Listen for syscall signals for process to interrupt/quit
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)

	go func() {
		<-sig

		// Shutdown signal with grace period of 30 seconds
		shutdownCtx, shutdownCancel := context.WithTimeout(serverCtx, 30*time.Second)
		defer shutdownCancel()

		go func() {
			<-shutdownCtx.Done()
			if errors.Is(shutdownCtx.Err(), context.DeadlineExceeded) {
				log.Fatal("Graceful shutdown timed out.. forcing exit.")
			}
		}()

		log.Println("Shutting down server gracefully...")
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Fatalf("Server shutdown failed: %v", err)
		}
		serverStopCtx()
	}()

	log.Printf("WebSocket server starting on port %s (redis: %s)...", cfg.Port, cfg.RedisAddr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("Server startup failed: %v", err)
	}

	// Wait for server context to be stopped
	<-serverCtx.Done()
	log.Println("Server gracefully stopped.")
}
