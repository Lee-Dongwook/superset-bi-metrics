package ws

import (
	"log"
	"sync"
)

// channelMessage contains a payload targeted at a specific channel_id.
type channelMessage struct {
	channelID string
	payload   []byte
}

type clientReply struct {
	client  *Client
	payload []byte
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
	channelMessages chan *channelMessage

	// Register requests from clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	// Channel subscription requests.
	subscribe chan *subscriptionReq

	// Channel unsubscription requests.
	unsubscribe chan *subscriptionReq

	// Direct replies to a single client (e.g. pong).
	reply chan *clientReply

	mu sync.RWMutex
}

// NewHub creates a new Hub instance.
func NewHub() *Hub {
	return &Hub{
		clients:         make(map[*Client]bool),
		channels:        make(map[string]map[*Client]bool),
		broadcast:       make(chan []byte, 256),
		channelMessages: make(chan *channelMessage, 256),
		register:        make(chan *Client),
		unregister:      make(chan *Client),
		subscribe:       make(chan *subscriptionReq),
		unsubscribe:     make(chan *subscriptionReq),
		reply:           make(chan *clientReply, 256),
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
			h.removeClient(client)
			h.mu.Unlock()
			log.Printf("[Hub] Client disconnected. Total active clients: %d", h.ClientCount())

		case req := <-h.subscribe:
			h.mu.Lock()
			if !h.clients[req.client] {
				// Already evicted or unregistered; re-adding would leak a closed send channel.
				h.mu.Unlock()
				continue
			}
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

		case req := <-h.reply:
			h.mu.Lock()
			if h.clients[req.client] {
				h.trySend(req.client, req.payload)
			}
			h.mu.Unlock()

		case cm := <-h.channelMessages:
			h.mu.Lock()
			for client := range h.channels[cm.channelID] {
				h.trySend(client, cm.payload)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				h.trySend(client, message)
			}
			h.mu.Unlock()
		}
	}
}

// trySend delivers without blocking the hub; a client whose buffer is full is evicted.
// Caller must hold h.mu (write lock).
func (h *Hub) trySend(client *Client, payload []byte) {
	select {
	case client.send <- payload:
	default:
		h.removeClient(client)
	}
}

// removeClient drops the client from every map, then closes its send channel exactly once.
// Caller must hold h.mu (write lock).
func (h *Hub) removeClient(client *Client) {
	if !h.clients[client] {
		return
	}
	delete(h.clients, client)
	for chName, subscribers := range h.channels {
		delete(subscribers, client)
		if len(subscribers) == 0 {
			delete(h.channels, chName)
		}
	}
	close(client.send)
}

// CloseAll disconnects every client; their WritePump sends a close frame.
func (h *Hub) CloseAll() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for client := range h.clients {
		h.removeClient(client)
	}
}

// Reply enqueues a payload for a single client, dropped if the client is gone.
func (h *Hub) Reply(client *Client, payload []byte) {
	select {
	case h.reply <- &clientReply{client: client, payload: payload}:
	default:
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
	h.channelMessages <- &channelMessage{
		channelID: channelID,
		payload:   payload,
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
