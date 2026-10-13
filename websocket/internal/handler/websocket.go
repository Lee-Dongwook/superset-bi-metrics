package handler

import (
	"log"
	"net/http"
	"slices"
	"strings"

	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/ws"
	"github.com/gorilla/websocket"
)

// WebSocketHandler upgrades HTTP connections to WebSockets and binds them to the Hub.
// allowedOrigins is "*" or a comma-separated list of exact origins.
func WebSocketHandler(hub *ws.Hub, allowedOrigins string) http.HandlerFunc {
	origins := strings.Split(allowedOrigins, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}
	upgrader := websocket.Upgrader{
		ReadBufferSize:  4096,
		WriteBufferSize: 4096,
		CheckOrigin: func(r *http.Request) bool {
			return slices.Contains(origins, "*") || slices.Contains(origins, r.Header.Get("Origin"))
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

		// If channel_id is provided via query parameter, auto-subscribe
		if channelID := r.URL.Query().Get("channel_id"); channelID != "" {
			hub.Subscribe(client, channelID)
		}

		// Start client message pumps in separate goroutines
		go client.WritePump()
		go client.ReadPump()
	}
}
