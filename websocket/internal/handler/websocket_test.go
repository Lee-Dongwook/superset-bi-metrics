package handler

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/ws"
	"github.com/gorilla/websocket"
)

func TestWebSocketHandlerRoutesChannelEventsAndPing(t *testing.T) {
	hub := ws.NewHub()
	go hub.Run()

	srv := httptest.NewServer(WebSocketHandler(hub, "*"))
	defer srv.Close()

	url := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws?channel_id=chan-1"
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer conn.Close()
	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))

	if err := conn.WriteMessage(websocket.TextMessage, []byte(`{"action":"ping"}`)); err != nil {
		t.Fatalf("write ping: %v", err)
	}
	if _, msg, err := conn.ReadMessage(); err != nil || string(msg) != `{"action":"pong"}` {
		t.Fatalf("expected pong, got %q (err %v)", msg, err)
	}

	// The ping round-trip proves registration and the query-param subscription were processed.
	event := `{"channel_id":"chan-1","status":"RUNNING"}`
	hub.SendToChannel("chan-1", []byte(event))
	if _, msg, err := conn.ReadMessage(); err != nil || string(msg) != event {
		t.Fatalf("expected %s, got %q (err %v)", event, msg, err)
	}
}

func TestWebSocketHandlerRejectsUnknownOrigin(t *testing.T) {
	hub := ws.NewHub()
	go hub.Run()

	srv := httptest.NewServer(WebSocketHandler(hub, "http://allowed.example, http://other.example"))
	defer srv.Close()

	url := "ws" + strings.TrimPrefix(srv.URL, "http")
	header := map[string][]string{"Origin": {"http://evil.example"}}
	if _, _, err := websocket.DefaultDialer.Dial(url, header); err == nil {
		t.Fatal("expected handshake to fail for disallowed origin")
	}
	header["Origin"] = []string{"http://other.example"}
	conn, _, err := websocket.DefaultDialer.Dial(url, header)
	if err != nil {
		t.Fatalf("allowed origin rejected: %v", err)
	}
	conn.Close()
}
