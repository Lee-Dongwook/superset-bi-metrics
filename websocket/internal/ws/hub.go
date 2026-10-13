package ws

import (
	"log"
	"sync"
)

// ChannelMessage contains a payload targeted at a specific channel_id.
type ChannelMessage struct {
	ChannelID string
	Payload   []byte
}

type subscriptionReq struct {
	client    *Client
	channelID string
}

// Hub maintains the set of active clients and handles broadcast & channel-based routing.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Channel subscriptions: channelID -> map[*Client]bool
	channels map[string]map[*Client]bool

	// Inbound messages to broadcast to everyone.
	broadcast chan []byte

	// Inbound targeted messages for specific channels.
	channelMessages chan *ChannelMessage

	// Register requests from clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	// Channel subscription requests.
	subscribe chan *subscriptionReq

	// Channel unsubscription requests.
	unsubscribe chan *subscriptionReq

	mu sync.RWMutex
}

// NewHub creates a new Hub instance.
func NewHub() *Hub {
	return &Hub{
		clients:         make(map[*Client]bool),
		channels:        make(map[string]map[*Client]bool),
		broadcast:       make(chan []byte, 256),
		channelMessages: make(chan *ChannelMessage, 256),
		register:        make(chan *Client),
		unregister:      make(chan *Client),
		subscribe:       make(chan *subscriptionReq),
		unsubscribe:     make(chan *subscriptionReq),
	}
}

// Run listens for registration, channel routing, and broadcast events.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("[Hub] Client connected. Total active clients: %d", h.ClientCount())

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				// Clean up all channel subscriptions for this client
				for chName, subscribers := range h.channels {
					delete(subscribers, client)
					if len(subscribers) == 0 {
						delete(h.channels, chName)
					}
				}
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("[Hub] Client disconnected. Total active clients: %d", h.ClientCount())

		case req := <-h.subscribe:
			h.mu.Lock()
			if _, exists := h.channels[req.channelID]; !exists {
				h.channels[req.channelID] = make(map[*Client]bool)
			}
			h.channels[req.channelID][req.client] = true
			h.mu.Unlock()
			log.Printf("[Hub] Client subscribed to channel [%s]. Channel subscribers: %d",
				req.channelID, h.ChannelSubscribersCount(req.channelID))

		case req := <-h.unsubscribe:
			h.mu.Lock()
			if subscribers, exists := h.channels[req.channelID]; exists {
				delete(subscribers, req.client)
				if len(subscribers) == 0 {
					delete(h.channels, req.channelID)
				}
			}
			h.mu.Unlock()
			log.Printf("[Hub] Client unsubscribed from channel [%s].", req.channelID)

		case cm := <-h.channelMessages:
			h.mu.RLock()
			subscribers, exists := h.channels[cm.ChannelID]
			if exists {
				for client := range subscribers {
					select {
					case client.send <- cm.Payload:
					default:
						close(client.send)
						delete(h.clients, client)
						delete(subscribers, client)
					}
				}
			}
			h.mu.RUnlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Register enqueues a client registration.
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister enqueues a client unregistration.
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// Subscribe subscribes a client to a channel ID.
func (h *Hub) Subscribe(client *Client, channelID string) {
	if channelID == "" {
		return
	}
	h.subscribe <- &subscriptionReq{
		client:    client,
		channelID: channelID,
	}
}

// Unsubscribe unsubscribes a client from a channel ID.
func (h *Hub) Unsubscribe(client *Client, channelID string) {
	if channelID == "" {
		return
	}
	h.unsubscribe <- &subscriptionReq{
		client:    client,
		channelID: channelID,
	}
}

// SendToChannel sends a message to all clients subscribed to a specific channel ID.
func (h *Hub) SendToChannel(channelID string, payload []byte) {
	h.channelMessages <- &ChannelMessage{
		ChannelID: channelID,
		Payload:   payload,
	}
}

// Broadcast sends a message to all connected clients.
func (h *Hub) Broadcast(msg []byte) {
	h.broadcast <- msg
}

// ClientCount returns the number of active clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// ChannelSubscribersCount returns the number of subscribers for a given channel ID.
func (h *Hub) ChannelSubscribersCount(channelID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if subscribers, ok := h.channels[channelID]; ok {
		return len(subscribers)
	}
	return 0
}
