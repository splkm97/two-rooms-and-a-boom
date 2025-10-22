package websocket

import (
	"testing"
	"time"
)

func TestHub_RegisterClient(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	client := &Client{
		hub:      hub,
		roomCode: "TEST123",
		playerID: "player1",
		send:     make(chan []byte, 256),
	}

	hub.register <- client

	// Give time for registration
	time.Sleep(100 * time.Millisecond)

	if len(hub.rooms["TEST123"]) != 1 {
		t.Errorf("Expected 1 client in room, got %d", len(hub.rooms["TEST123"]))
	}
}

func TestHub_UnregisterClient(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	client := &Client{
		hub:      hub,
		roomCode: "TEST456",
		playerID: "player2",
		send:     make(chan []byte, 256),
	}

	hub.register <- client
	time.Sleep(100 * time.Millisecond)

	hub.unregister <- client
	time.Sleep(100 * time.Millisecond)

	if len(hub.rooms["TEST456"]) != 0 {
		t.Errorf("Expected 0 clients in room after unregister, got %d", len(hub.rooms["TEST456"]))
	}
}

func TestHub_BroadcastToRoom(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	client1 := &Client{
		hub:      hub,
		roomCode: "BROADCAST",
		playerID: "player1",
		send:     make(chan []byte, 256),
	}
	client2 := &Client{
		hub:      hub,
		roomCode: "BROADCAST",
		playerID: "player2",
		send:     make(chan []byte, 256),
	}

	hub.register <- client1
	hub.register <- client2
	time.Sleep(100 * time.Millisecond)

	testMsg := []byte("test message")
	hub.BroadcastToRoom("BROADCAST", testMsg)

	time.Sleep(100 * time.Millisecond)

	// Both clients should receive the message
	select {
	case msg := <-client1.send:
		if string(msg) != string(testMsg) {
			t.Errorf("Client1 received wrong message: %s", string(msg))
		}
	default:
		t.Error("Client1 did not receive message")
	}

	select {
	case msg := <-client2.send:
		if string(msg) != string(testMsg) {
			t.Errorf("Client2 received wrong message: %s", string(msg))
		}
	default:
		t.Error("Client2 did not receive message")
	}
}
