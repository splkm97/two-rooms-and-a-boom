package websocket

import (
	"log"
	"sync"
	"time"
)

// Hub maintains active WebSocket connections and broadcasts messages
type Hub struct {
	// Registered clients per room (roomCode -> map of clients)
	rooms map[string]map[*Client]bool

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Mutex for thread-safe access
	mu sync.RWMutex

	// Disconnected clients with grace period (playerID -> disconnectTime)
	disconnected map[string]time.Time
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		rooms:        make(map[string]map[*Client]bool),
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		disconnected: make(map[string]time.Time),
	}
}

// Run starts the hub's main event loop
func (h *Hub) Run() {
	// Start grace period cleanup goroutine
	go h.cleanupDisconnected()

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.rooms[client.roomCode] == nil {
				h.rooms[client.roomCode] = make(map[*Client]bool)
			}
			h.rooms[client.roomCode][client] = true
			
			// Remove from disconnected if reconnecting
			delete(h.disconnected, client.playerID)
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.rooms[client.roomCode]; ok {
				if clients[client] {
					delete(clients, client)
					close(client.send)

					// Mark as disconnected with timestamp
					h.disconnected[client.playerID] = time.Now()

					// Broadcast PLAYER_DISCONNECTED event
					if client.playerID != "" {
						payload := &PlayerDisconnectedPayload{
							PlayerID: client.playerID,
						}
						msg, err := NewMessage(MessagePlayerDisconnected, payload)
						if err == nil {
							data, _ := msg.Marshal()
							// Broadcast to remaining clients in the room
							for otherClient := range clients {
								select {
								case otherClient.send <- data:
								default:
									// Client buffer full, skip
								}
							}
						}
					}

					// Clean up empty rooms
					if len(clients) == 0 {
						delete(h.rooms, client.roomCode)
					}
				}
			}
			h.mu.Unlock()
		}
	}
}

// BroadcastToRoom sends a message to all clients in a room
func (h *Hub) BroadcastToRoom(roomCode string, message []byte) {
	// Create a copy of clients while holding the lock to avoid concurrent map iteration
	h.mu.RLock()
	roomClients := h.rooms[roomCode]
	clientsCopy := make([]*Client, 0, len(roomClients))
	for client := range roomClients {
		clientsCopy = append(clientsCopy, client)
	}
	h.mu.RUnlock()

	// Now safely iterate over the copy without holding the lock
	for _, client := range clientsCopy {
		// Use Client.Send which has panic recovery and proper handling
		client.Send(message)
	}
}

// BroadcastToRoomColor sends a message to players in a specific room color (RED_ROOM or BLUE_ROOM)
// This is used for private events that should only be visible to one team
func (h *Hub) BroadcastToRoomColor(roomCode string, playerIDs []string, message []byte) {
	// Build a set for quick lookup
	targetPlayers := make(map[string]bool)
	for _, id := range playerIDs {
		targetPlayers[id] = true
	}

	// Create a copy of clients while holding the lock to avoid concurrent map iteration
	h.mu.RLock()
	roomClients := h.rooms[roomCode]
	clientsCopy := make([]*Client, 0, len(roomClients))
	for client := range roomClients {
		clientsCopy = append(clientsCopy, client)
	}
	h.mu.RUnlock()

	// Now safely iterate over the copy without holding the lock
	for _, client := range clientsCopy {
		if targetPlayers[client.playerID] {
			client.Send(message)
		}
	}
}

// SendToClient sends a message to a specific client (unicast)
func (h *Hub) SendToClient(roomCode, playerID string, message []byte) {
	// Create a copy of clients while holding the lock to avoid concurrent map iteration
	h.mu.RLock()
	roomClients := h.rooms[roomCode]
	clientsCopy := make([]*Client, 0, len(roomClients))
	for client := range roomClients {
		clientsCopy = append(clientsCopy, client)
	}
	h.mu.RUnlock()

	// Now safely iterate over the copy without holding the lock
	found := false
	for _, client := range clientsCopy {
		if client.playerID == playerID {
			found = true
			select {
			case client.send <- message:
				log.Printf("[DEBUG] Sent message to player %s in room %s", playerID, roomCode)
			default:
				log.Printf("[WARN] Failed to send message to player %s (buffer full)", playerID)
			}
			break
		}
	}
	if !found {
		log.Printf("[WARN] Player %s not found in room %s for unicast message", playerID, roomCode)
	}
}

// cleanupDisconnected removes players who haven't reconnected within 30 seconds
func (h *Hub) cleanupDisconnected() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		h.mu.Lock()
		now := time.Now()
		for playerID, disconnectTime := range h.disconnected {
			if now.Sub(disconnectTime) > 30*time.Second {
				// Grace period expired, permanently remove
				delete(h.disconnected, playerID)
				// TODO: Broadcast PLAYER_DISCONNECTED message (T017.3)
			}
		}
		h.mu.Unlock()
	}
}

// IsPlayerDisconnected checks if a player is in the disconnected grace period
func (h *Hub) IsPlayerDisconnected(playerID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	_, exists := h.disconnected[playerID]
	return exists
}

// RegisterClient registers a client with the hub
func (h *Hub) RegisterClient(client *Client) {
	h.register <- client
}

// UnregisterClient unregisters a client from the hub
func (h *Hub) UnregisterClient(client *Client) {
	h.unregister <- client
}

// T043: Implement PLAYER_JOINED broadcast
func (h *Hub) BroadcastPlayerJoined(roomCode string, payload *PlayerJoinedPayload) error {
	msg, err := NewMessage(MessagePlayerJoined, payload)
	if err != nil {
		return err
	}

	data, err := msg.Marshal()
	if err != nil {
		return err
	}

	h.BroadcastToRoom(roomCode, data)
	return nil
}

// T044: Implement PLAYER_LEFT broadcast
func (h *Hub) BroadcastPlayerLeft(roomCode string, payload *PlayerLeftPayload) error {
	msg, err := NewMessage(MessagePlayerLeft, payload)
	if err != nil {
		return err
	}

	data, err := msg.Marshal()
	if err != nil {
		return err
	}

	h.BroadcastToRoom(roomCode, data)
	return nil
}

// T045: Implement NICKNAME_CHANGED broadcast
func (h *Hub) BroadcastNicknameChanged(roomCode string, payload *NicknameChangedPayload) error {
	msg, err := NewMessage(MessageNicknameChanged, payload)
	if err != nil {
		return err
	}

	data, err := msg.Marshal()
	if err != nil {
		return err
	}

	h.BroadcastToRoom(roomCode, data)
	return nil
}

// T100: Implement OWNER_CHANGED broadcast
func (h *Hub) BroadcastOwnerChanged(roomCode string, payload *OwnerChangedPayload) error {
	msg, err := NewMessage(MessageOwnerChanged, payload)
	if err != nil {
		return err
	}

	data, err := msg.Marshal()
	if err != nil {
		return err
	}

	h.BroadcastToRoom(roomCode, data)
	return nil
}

// BroadcastRoomClosed broadcasts ROOM_CLOSED event to all players in the room
func (h *Hub) BroadcastRoomClosed(roomCode string) error {
	payload := &RoomClosedPayload{
		Reason: "방장이 나갔습니다",
	}
	msg, err := NewMessage(MessageRoomClosed, payload)
	if err != nil {
		return err
	}

	data, err := msg.Marshal()
	if err != nil {
		return err
	}

	h.BroadcastToRoom(roomCode, data)
	return nil
}

// T074: Implement GAME_STARTED broadcast
func (h *Hub) BroadcastGameStarted(roomCode string, payload interface{}) error {
	msg, err := NewMessage(MessageGameStarted, payload)
	if err != nil {
		return err
	}

	data, err := msg.Marshal()
	if err != nil {
		return err
	}

	h.BroadcastToRoom(roomCode, data)
	return nil
}

// T075: Implement ROLE_ASSIGNED unicast (to individual player)
func (h *Hub) SendRoleAssigned(roomCode, playerID string, payload interface{}) error {
	log.Printf("[DEBUG] SendRoleAssigned called: room=%s player=%s", roomCode, playerID)
	msg, err := NewMessage(MessageRoleAssigned, payload)
	if err != nil {
		log.Printf("[ERROR] Failed to create ROLE_ASSIGNED message: %v", err)
		return err
	}

	data, err := msg.Marshal()
	if err != nil {
		log.Printf("[ERROR] Failed to marshal ROLE_ASSIGNED message: %v", err)
		return err
	}

	log.Printf("[DEBUG] Sending ROLE_ASSIGNED to player %s: %s", playerID, string(data))
	h.SendToClient(roomCode, playerID, data)
	return nil
}

// T091: Implement GAME_RESET broadcast
func (h *Hub) BroadcastGameReset(roomCode string, payload interface{}) error {
	msg, err := NewMessage(MessageGameReset, payload)
	if err != nil {
		return err
	}

	data, err := msg.Marshal()
	if err != nil {
		return err
	}

	h.BroadcastToRoom(roomCode, data)
	return nil
}

// Broadcast and Unicast wrappers for interface{} payloads (for service layer)
func (h *Hub) Broadcast(roomCode string, message Message) {
	data, _ := message.Marshal()
	h.BroadcastToRoom(roomCode, data)
}

func (h *Hub) Unicast(roomCode, playerID string, message Message) {
	data, _ := message.Marshal()
	h.SendToClient(roomCode, playerID, data)
}
