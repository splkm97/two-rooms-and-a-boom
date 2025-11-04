package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kalee/two-rooms-and-a-boom/internal/services"
	ws "github.com/kalee/two-rooms-and-a-boom/internal/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for development
		// TODO: Restrict in production
		return true
	},
}

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	hub           *ws.Hub
	roomService   *services.RoomService
	playerService *services.PlayerService
}

// NewWebSocketHandler creates a new WebSocketHandler instance
func NewWebSocketHandler(hub *ws.Hub, roomService *services.RoomService, playerService *services.PlayerService) *WebSocketHandler {
	return &WebSocketHandler{
		hub:           hub,
		roomService:   roomService,
		playerService: playerService,
	}
}

// T042: Create WebSocket /ws/{roomCode} handler
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	roomCode := c.Param("roomCode")

	// Optional: Get playerID from query parameter
	playerID := c.Query("playerId")

	// Verify room exists
	_, err := h.roomService.GetRoom(roomCode)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    "ROOM_NOT_FOUND",
			"message": "Room not found",
		})
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[ERROR] Failed to upgrade WebSocket connection for room %s: %v", roomCode, err)
		return
	}

	log.Printf("[INFO] WebSocket connection upgraded successfully for room %s", roomCode)

	// Create WebSocket client
	client := ws.NewClient(h.hub, conn, roomCode)

	// Set playerID if provided
	if playerID != "" {
		client.SetPlayerID(playerID)
		log.Printf("[INFO] WebSocket client registered with playerID: %s", playerID)
	}

	// Register client with hub
	h.registerClient(client)

	// Start client read/write pumps
	go client.WritePump()
	go client.ReadPump()

	// Send welcome message in a goroutine to avoid blocking
	go func() {
		welcomeMsg, _ := ws.NewMessage("CONNECTED", map[string]interface{}{
			"roomCode": roomCode,
			"message":  "WebSocket connected successfully",
		})
		// Send CONNECTED only to this client (not broadcast to room)
		data, _ := welcomeMsg.Marshal()
		client.Send(data)
		log.Printf("[INFO] Sent CONNECTED message to client in room %s", roomCode)
	}()

	// Broadcast PLAYER_JOINED message
	go h.broadcastPlayerJoined(roomCode, playerID)
}

// registerClient registers a client with the hub
func (h *WebSocketHandler) registerClient(client *ws.Client) {
	// Access the hub's register channel through reflection or add a public method
	// For simplicity, we'll add a RegisterClient method to Hub
	h.hub.RegisterClient(client)
}

// broadcastPlayerJoined broadcasts PLAYER_JOINED message to room
func (h *WebSocketHandler) broadcastPlayerJoined(roomCode string, playerID string) {
	// Give time for the client to register
	time.Sleep(100 * time.Millisecond)

	// If playerID is provided, get player info from room
	payload := map[string]interface{}{
		"roomCode": roomCode,
	}

	if playerID != "" {
		// Get room and find player
		room, err := h.roomService.GetRoom(roomCode)
		if err == nil && room != nil {
			// Find player in room
			for _, player := range room.Players {
				if player.ID == playerID {
					payload["player"] = map[string]interface{}{
						"id":       player.ID,
						"nickname": player.Nickname,
					}
					break
				}
			}
		}
	}

	// Broadcast PLAYER_JOINED message
	playerJoinedMsg, _ := ws.NewMessage("PLAYER_JOINED", payload)
	h.hub.Broadcast(roomCode, *playerJoinedMsg)
	log.Printf("[INFO] Broadcast PLAYER_JOINED message to room %s", roomCode)
}
