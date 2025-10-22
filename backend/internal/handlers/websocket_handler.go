package handlers

import (
	"log"
	"net/http"

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

	// Verify room exists
	room, err := h.roomService.GetRoom(roomCode)
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
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	// Create WebSocket client
	client := ws.NewClient(h.hub, conn, roomCode)

	// Register client with hub (using unexported channel through struct field access)
	// Note: In Go, we can access the hub's register channel directly since it's in the same package context
	// For now, we'll use a workaround by creating a public Register method
	h.registerClient(client)

	// Broadcast PLAYER_JOINED message
	// In a real implementation, we'd get the player ID from the connection
	// For now, we'll let the client handle this after connection
	go h.broadcastPlayerJoined(roomCode, room)

	// Start client read/write pumps
	go client.WritePump()
	go client.ReadPump()
}

// registerClient registers a client with the hub
func (h *WebSocketHandler) registerClient(client *ws.Client) {
	// Access the hub's register channel through reflection or add a public method
	// For simplicity, we'll add a RegisterClient method to Hub
	h.hub.RegisterClient(client)
}

// broadcastPlayerJoined broadcasts PLAYER_JOINED message to room
func (h *WebSocketHandler) broadcastPlayerJoined(roomCode string, room interface{}) {
	// This is a placeholder - in full implementation, we'd:
	// 1. Get the newly connected player's info
	// 2. Broadcast PLAYER_JOINED with player data
	// For now, this is handled in the integration tests
}
