package websocket

import (
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512
)

// Client represents a WebSocket client connection
type Client struct {
	hub *Hub

	// The WebSocket connection
	conn *websocket.Conn

	// Room code this client belongs to
	roomCode string

	// Player ID
	playerID string

	// Buffered channel of outbound messages
	send chan []byte
}

// NewClient creates a new WebSocket client
func NewClient(hub *Hub, conn *websocket.Conn, roomCode string) *Client {
	return &Client{
		hub:      hub,
		conn:     conn,
		roomCode: roomCode,
		playerID: "", // Will be set later when player joins
		send:     make(chan []byte, 256),
	}
}

// SetPlayerID sets the player ID for this client
func (c *Client) SetPlayerID(playerID string) {
	c.playerID = playerID
}

// Send sends a message to this client
// Send sends a message to this client
// Send sends a message to this client
func (c *Client) Send(data []byte) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[WARN] Recovered from panic sending to client in room %s: %v", c.roomCode, r)
		}
	}()
	
	select {
	case c.send <- data:
		// Message sent successfully
	default:
		// Channel is full, log and skip
		log.Printf("[WARN] Failed to send message to client in room %s (channel full)", c.roomCode)
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub
func (c *Client) ReadPump() {
	defer func() {
		log.Printf("[INFO] ReadPump exiting for room %s", c.roomCode)
		c.hub.unregister <- c
		c.conn.Close()
	}()

	log.Printf("[INFO] ReadPump started for room %s", c.roomCode)

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[ERROR] Unexpected close error in room %s: %v", c.roomCode, err)
			} else {
				log.Printf("[INFO] Connection closed normally in room %s: %v", c.roomCode, err)
			}
			break
		}
		// Messages from client can be handled here if needed
		log.Printf("[DEBUG] Received message from client in room %s: %s", c.roomCode, string(message))
		_ = message
	}
}

// WritePump pumps messages from the hub to the WebSocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		log.Printf("[INFO] WritePump exiting for room %s", c.roomCode)
		ticker.Stop()
		c.conn.Close()
	}()

	log.Printf("[INFO] WritePump started for room %s", c.roomCode)

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel
				log.Printf("[INFO] Hub closed send channel for room %s", c.roomCode)
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			log.Printf("[DEBUG] Writing message to client in room %s: %s", c.roomCode, string(message))
			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				log.Printf("[ERROR] Failed to get writer for room %s: %v", c.roomCode, err)
				return
			}
			w.Write(message)

			// Add queued messages to the current WebSocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				log.Printf("[ERROR] Failed to close writer for room %s: %v", c.roomCode, err)
				return
			}
			log.Printf("[DEBUG] Successfully sent message to client in room %s", c.roomCode)

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("[ERROR] Failed to send ping for room %s: %v", c.roomCode, err)
				return
			}
			log.Printf("[DEBUG] Sent ping to client in room %s", c.roomCode)
		}
	}
}
