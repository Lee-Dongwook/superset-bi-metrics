package ws

import (
	"testing"
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
