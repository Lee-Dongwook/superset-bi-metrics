package ws

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 65536
)

// ControlMessage represents an inbound client command (e.g., subscribe, unsubscribe).
type ControlMessage struct {
	Action    string `json:"action,omitempty"`
	Type      string `json:"type,omitempty"`
	ChannelID string `json:"channel_id,omitempty"`
}

// Client is an intermediary between the websocket connection and the hub.
type Client struct {
	Hub *Hub

	// The websocket connection.
	Conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte
}

// NewClient creates a new Client instance.
func NewClient(hub *Hub, conn *websocket.Conn) *Client {
	return &Client{
		Hub:  hub,
		Conn: conn,
		send: make(chan []byte, 256),
	}
}

// ReadPump pumps messages from the websocket connection to the hub.
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister(c)
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[Client] Read error: %v", err)
			}
			break
		}

		// Check if message is a JSON control command
		var cmd ControlMessage
		if err := json.Unmarshal(message, &cmd); err == nil && (cmd.Action != "" || cmd.Type != "") {
			action := cmd.Action
			if action == "" {
				action = cmd.Type
			}

			switch action {
			case "subscribe":
				if cmd.ChannelID != "" {
					c.Hub.Subscribe(c, cmd.ChannelID)
				}
				continue
			case "unsubscribe":
				if cmd.ChannelID != "" {
					c.Hub.Unsubscribe(c, cmd.ChannelID)
				}
				continue
			case "ping":
				c.Hub.Reply(c, []byte(`{"action":"pong"}`))
				continue
			}
		}
		// Only Redis produces events; unknown client frames are ignored.
	}
}

// WritePump pumps messages from the hub to the websocket connection.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				_ = c.Conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
				return
			}

			// One JSON event per frame: clients JSON.parse each message.
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
