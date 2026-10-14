package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/config"
	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/handler"
	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/redis"
	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/ws"
)

const shutdownTimeout = 30 * time.Second

func main() {
	cfg := config.LoadConfig()

	// Canceled on the first termination signal; stops the Redis subscriber loop.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	defer stop()

	hub := ws.NewHub()
	go hub.Run()

	redisSub := redis.NewSubscriber(cfg.RedisAddr, cfg.RedisChannel, hub)
	go redisSub.Start(ctx)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", handler.HealthCheckHandler())
	mux.HandleFunc("/ws", handler.WebSocketHandler(hub, cfg.AllowedOrigins))

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	// Shutdown doesn't track hijacked WebSocket conns; close them explicitly.
	server.RegisterOnShutdown(hub.CloseAll)

	go func() {
		log.Printf("WebSocket server starting on port %s (redis: %s, channel: %s)...", cfg.Port, cfg.RedisAddr, cfg.RedisChannel)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Server startup failed: %v", err)
		}
	}()

	<-ctx.Done()
	stop() // a second signal now kills the process immediately
	log.Println("Shutting down server gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server shutdown failed: %v", err)
	}
	if err := redisSub.Close(); err != nil {
		log.Printf("Redis client close failed: %v", err)
	}
	log.Println("Server gracefully stopped.")
}
