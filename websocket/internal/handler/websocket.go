package handler

import (
	"log"
	"net/http"

	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/ws"
	"github.com/gorilla/websocket"
)

// WebSocketHandler upgrades HTTP connections to WebSockets and binds them to the Hub.
func WebSocketHandler(hub *ws.Hub, allowedOrigins string) http.HandlerFunc {
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			if allowedOrigins == "*" {
				return true
			}
			origin := r.Header.Get("Origin")
			return origin == allowedOrigins
		},
	}

	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[Handler] Failed to upgrade connection: %v", err)
			return
		}

		client := ws.NewClient(hub, conn)
		hub.Register(client)

		// Start client message pumps in separate goroutines
		go client.WritePump()
		go client.ReadPump()
	}
}
