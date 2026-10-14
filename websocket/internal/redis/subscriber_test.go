package redis

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/handler"
	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/ws"
	"github.com/gorilla/websocket"
)

func TestSubscriberDispatchMessage(t *testing.T) {
	hub := ws.NewHub()
	go hub.Run()
	sub := &Subscriber{hub: hub}

	srv := httptest.NewServer(handler.WebSocketHandler(hub, "*"))
	defer srv.Close()
	conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(srv.URL, "http")+"?channel_id=test-chan-1", nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer conn.Close()
	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))

	// Ping round-trip guarantees the hub has processed the registration and subscription.
	_ = conn.WriteMessage(websocket.TextMessage, []byte(`{"action":"ping"}`))
	if _, _, err := conn.ReadMessage(); err != nil {
		t.Fatalf("read pong: %v", err)
	}

	targeted := `{"channel_id":"test-chan-1","query_id":"q-100","status":"RUNNING","stage":{"progress_percent":50}}`
	otherChannel := `{"channel_id":"someone-else","query_id":"q-101","status":"RUNNING"}`
	broadcast := `{"query_id":"q-102","status":"SUCCESS"}`

	sub.dispatchMessage([]byte(otherChannel))       // not subscribed: must not arrive
	sub.dispatchMessage([]byte("raw string event")) // non-JSON: dropped
	sub.dispatchMessage([]byte(targeted))
	sub.dispatchMessage([]byte(broadcast))

	// Channel and broadcast queues are drained independently, so order across them is not guaranteed.
	want := map[string]bool{targeted: true, broadcast: true}
	for range 2 {
		_, msg, err := conn.ReadMessage()
		if err != nil || !want[string(msg)] {
			t.Fatalf("unexpected message %q (err %v)", msg, err)
		}
		delete(want, string(msg))
	}
}
