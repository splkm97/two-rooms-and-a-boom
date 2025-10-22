package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kalee/two-rooms-and-a-boom/internal/services"
)

// RoomHandler handles room-related HTTP requests
type RoomHandler struct {
	roomService *services.RoomService
}

// NewRoomHandler creates a new RoomHandler instance
func NewRoomHandler(roomService *services.RoomService) *RoomHandler {
	return &RoomHandler{
		roomService: roomService,
	}
}

// CreateRoomRequest represents the request body for creating a room
type CreateRoomRequest struct {
	MaxPlayers int `json:"maxPlayers" binding:"required,min=6,max=30"`
}

// T038: Create POST /api/v1/rooms handler
func (h *RoomHandler) CreateRoom(c *gin.Context) {
	var req CreateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_REQUEST",
			"message": err.Error(),
		})
		return
	}

	room, err := h.roomService.CreateRoom(req.MaxPlayers)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "CREATE_ROOM_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, room)
}

// T039: Create GET /api/v1/rooms/{roomCode} handler
func (h *RoomHandler) GetRoom(c *gin.Context) {
	roomCode := c.Param("roomCode")

	// Validate room code format (6 characters)
	if len(roomCode) != 6 {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_ROOM_CODE",
			"message": "Room code must be 6 characters",
		})
		return
	}

	room, err := h.roomService.GetRoom(roomCode)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    "ROOM_NOT_FOUND",
			"message": "Room not found",
		})
		return
	}

	c.JSON(http.StatusOK, room)
}
