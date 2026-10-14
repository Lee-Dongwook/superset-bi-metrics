package redis

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/Lee-Dongwook/superset-bi-metrics/websocket/internal/ws"
	"github.com/redis/go-redis/v9"
)

// Subscriber manages the Redis connection and forwards incoming pub/sub events to the WebSocket Hub.
type Subscriber struct {
	redisAddr string
	channel   string
	hub       *ws.Hub
	client    *redis.Client
}

// NewSubscriber creates a new Subscriber instance.
func NewSubscriber(redisAddr string, channel string, hub *ws.Hub) *Subscriber {
	client := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	return &Subscriber{
		redisAddr: redisAddr,
		channel:   channel,
		hub:       hub,
		client:    client,
	}
}

// Start listens for Redis pub/sub messages in a resilient loop until the context is canceled.
func (s *Subscriber) Start(ctx context.Context) {
	log.Printf("[Redis] Connecting to Redis at %s for channel [%s]...", s.redisAddr, s.channel)

	backoff := 1 * time.Second
	maxBackoff := 15 * time.Second

	for {
		select {
		case <-ctx.Done():
			log.Println("[Redis] Subscriber stopped via context cancel.")
			return
		default:
		}

		// Ping to test connectivity
		pingCtx, pingCancel := context.WithTimeout(ctx, 3*time.Second)
		err := s.client.Ping(pingCtx).Err()
		pingCancel()

		if err != nil {
			log.Printf("[Redis] Connection attempt to %s failed: %v. Retrying in %v...", s.redisAddr, err, backoff)
			select {
			case <-time.After(backoff):
				backoff *= 2
				if backoff > maxBackoff {
					backoff = maxBackoff
				}
				continue
			case <-ctx.Done():
				return
			}
		}

		// Connected successfully, reset backoff
		backoff = 1 * time.Second
		log.Printf("[Redis] Connected successfully. Subscribing to [%s]...", s.channel)

		pubsub := s.client.Subscribe(ctx, s.channel)
		ch := pubsub.Channel()

		s.consumeChannel(ctx, ch)

		_ = pubsub.Close()
	}
}

func (s *Subscriber) consumeChannel(ctx context.Context, ch <-chan *redis.Message) {
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				log.Println("[Redis] Pub/Sub channel closed, will attempt to reconnect...")
				return
			}

			s.dispatchMessage([]byte(msg.Payload))
		}
	}
}

func (s *Subscriber) dispatchMessage(raw []byte) {
	// Only routing fields are decoded, so schema drift elsewhere never misroutes an event.
	var event struct {
		ChannelID string `json:"channel_id"`
		QueryID   string `json:"query_id"`
		Status    string `json:"status"`
	}
	if err := json.Unmarshal(raw, &event); err != nil {
		log.Printf("[Redis] Dropping non-JSON message: %v", err)
		return
	}

	if event.ChannelID != "" {
		log.Printf("[Redis] Routing event for query [%s] to channel [%s] (status: %s)",
			event.QueryID, event.ChannelID, event.Status)
		s.hub.SendToChannel(event.ChannelID, raw)
	} else {
		log.Printf("[Redis] Broadcasting event for query [%s] to all clients (status: %s)",
			event.QueryID, event.Status)
		s.hub.Broadcast(raw)
	}
}

// Close closes the Redis client connection.
func (s *Subscriber) Close() error {
	return s.client.Close()
}
