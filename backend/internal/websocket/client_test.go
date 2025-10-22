package websocket

import (
	"testing"
)

func TestClient_Creation(t *testing.T) {
	hub := NewHub()
	
	client := &Client{
		hub:      hub,
		conn:     nil, // Would be a real WebSocket connection in production
		roomCode: "TEST789",
		playerID: "player3",
		send:     make(chan []byte, 256),
	}

	if client.roomCode != "TEST789" {
		t.Errorf("Expected roomCode TEST789, got %s", client.roomCode)
	}

	if client.playerID != "player3" {
		t.Errorf("Expected playerID player3, got %s", client.playerID)
	}

	if cap(client.send) != 256 {
		t.Errorf("Expected send buffer capacity 256, got %d", cap(client.send))
	}
}
