package ws

import (
	"sync"
	"testing"
	"time"
)

func TestHubCreation(t *testing.T) {
	hub := NewHub()
	if hub == nil {
		t.Fatal("expected hub to be initialized")
	}

	if count := hub.ClientCount(); count != 0 {
		t.Errorf("expected 0 clients, got %d", count)
	}
}

func TestHubChannelSubscriptionAndRouting(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	c1 := &Client{
		Hub:  hub,
		send: make(chan []byte, 10),
	}
	c2 := &Client{
		Hub:  hub,
		send: make(chan []byte, 10),
	}

	hub.Register(c1)
	hub.Register(c2)

	// Wait for registration
	time.Sleep(50 * time.Millisecond)

	if count := hub.ClientCount(); count != 2 {
		t.Fatalf("expected 2 clients, got %d", count)
	}

	// Subscribe c1 to channel "user-123"
	hub.Subscribe(c1, "user-123")
	time.Sleep(50 * time.Millisecond)

	if subscribers := hub.ChannelSubscribersCount("user-123"); subscribers != 1 {
		t.Fatalf("expected 1 subscriber for user-123, got %d", subscribers)
	}

	// Send message to "user-123"
	testPayload := []byte(`{"status":"RUNNING","query_id":"q-1"}`)
	hub.SendToChannel("user-123", testPayload)

	select {
	case msg := <-c1.send:
		if string(msg) != string(testPayload) {
			t.Errorf("expected %s, got %s", string(testPayload), string(msg))
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatal("timed out waiting for message on c1")
	}

	// Verify c2 did NOT receive the message
	select {
	case msg := <-c2.send:
		t.Fatalf("unexpected message received by c2: %s", string(msg))
	default:
		// Expected
	}

	// Unregister c1 and verify channel subscriber count drops
	hub.Unregister(c1)
	time.Sleep(50 * time.Millisecond)

	if subscribers := hub.ChannelSubscribersCount("user-123"); subscribers != 0 {
		t.Fatalf("expected 0 subscribers after client unregister, got %d", subscribers)
	}
}

func TestHubBroadcast(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	c1 := &Client{Hub: hub, send: make(chan []byte, 10)}
	c2 := &Client{Hub: hub, send: make(chan []byte, 10)}

	hub.Register(c1)
	hub.Register(c2)
	time.Sleep(50 * time.Millisecond)

	broadcastMsg := []byte(`{"action":"broadcast","data":"hello"}`)
	hub.Broadcast(broadcastMsg)

	var wg sync.WaitGroup
	wg.Add(2)

	checkClient := func(c *Client) {
		defer wg.Done()
		select {
		case msg := <-c.send:
			if string(msg) != string(broadcastMsg) {
				t.Errorf("expected %s, got %s", string(broadcastMsg), string(msg))
			}
		case <-time.After(200 * time.Millisecond):
			t.Error("timed out waiting for broadcast message")
		}
	}

	go checkClient(c1)
	go checkClient(c2)
	wg.Wait()
}

// A slow client evicted via one channel must not crash sends on its other channels.
func TestHubEvictionAcrossChannels(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	c := &Client{Hub: hub, send: make(chan []byte, 1)}
	hub.Register(c)
	hub.Subscribe(c, "A")
	hub.Subscribe(c, "B")
	hub.SendToChannel("A", []byte("1")) // fills buffer
	hub.SendToChannel("A", []byte("2")) // evicts
	hub.SendToChannel("B", []byte("3")) // used to panic: send on closed channel
	hub.Subscribe(c, "C")               // must not resurrect the evicted client
	time.Sleep(50 * time.Millisecond)

	if n := hub.ClientCount(); n != 0 {
		t.Fatalf("expected evicted client gone, got %d clients", n)
	}
	if n := hub.ChannelSubscribersCount("C"); n != 0 {
		t.Fatalf("evicted client re-subscribed to C")
	}
}
