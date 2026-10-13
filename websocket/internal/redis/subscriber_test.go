package redis

import (
	"testing"
	"time"

	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/ws"
)

func TestSubscriberDispatchMessage(t *testing.T) {
	hub := ws.NewHub()
	go hub.Run()

	sub := &Subscriber{
		redisAddr: "localhost:6379",
		channel:   "query_events",
		hub:       hub,
	}

	// 1. Channel-targeted message dispatch
	targetedPayload := []byte(`{
		"channel_id": "test-chan-1",
		"query_id": "q-100",
		"status": "RUNNING",
		"stage": {
			"step": "BUILDING_PRE_AGGREGATIONS",
			"description": "Cube building orders_preagg",
			"progress_percent": 50
		}
	}`)

	sub.dispatchMessage(targetedPayload)

	// 2. Non-JSON fallback broadcast
	sub.dispatchMessage([]byte("raw string event"))

	time.Sleep(10 * time.Millisecond)
}
