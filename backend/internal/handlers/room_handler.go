package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kalee/two-rooms-and-a-boom/internal/config"
	"github.com/kalee/two-rooms-and-a-boom/internal/services"
)

// RoomHandler handles room-related HTTP requests
type RoomHandler struct {
	roomService *services.RoomService
	roleLoader  *config.RoleConfigLoader
}

// NewRoomHandler creates a new RoomHandler instance
func NewRoomHandler(roomService *services.RoomService, roleLoader *config.RoleConfigLoader) *RoomHandler {
	return &RoomHandler{
		roomService: roomService,
		roleLoader:  roleLoader,
	}
}

// CreateRoomRequest represents the request body for creating a room
type CreateRoomRequest struct {
	MaxPlayers   int    `json:"maxPlayers" binding:"required,min=6,max=30"`
	IsPublic     *bool  `json:"isPublic"`     // Optional, defaults to true if not provided
	RoleConfigID string `json:"roleConfigId"` // Optional, defaults to "standard" if not provided
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

	// Default to true if not specified
	isPublic := true
	if req.IsPublic != nil {
		isPublic = *req.IsPublic
	}

	// Default to "standard" if not specified
	roleConfigID := req.RoleConfigID
	if roleConfigID == "" {
		roleConfigID = "standard"
	}

	// Validate role config exists
	if h.roleLoader != nil {
		if _, err := h.roleLoader.Get(roleConfigID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "INVALID_ROLE_CONFIG",
				"message": fmt.Sprintf("Role configuration '%s' not found", roleConfigID),
			})
			return
		}
	}

	room, err := h.roomService.CreateRoom(req.MaxPlayers, isPublic, roleConfigID)
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

// ListRooms handles GET /api/v1/rooms - lists all public rooms
func (h *RoomHandler) ListRooms(c *gin.Context) {
	// Parse query parameters
	status := c.Query("status")
	limit := 50 // default
	offset := 0 // default

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := parseIntParam(limitStr, "limit"); err == nil {
			limit = l
		} else {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "INVALID_PARAMETER",
				"message": err.Error(),
			})
			return
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := parseIntParam(offsetStr, "offset"); err == nil {
			offset = o
		} else {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "INVALID_PARAMETER",
				"message": err.Error(),
			})
			return
		}
	}

	// Call service
	response, err := h.roomService.GetPublicRooms(status, limit, offset)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_REQUEST",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// UpdateRoomVisibilityRequest represents the request body for updating room visibility
type UpdateRoomVisibilityRequest struct {
	IsPublic bool `json:"isPublic" binding:"required"`
}

// UpdateRoomVisibility handles PATCH /api/v1/rooms/:roomCode/visibility
func (h *RoomHandler) UpdateRoomVisibility(c *gin.Context) {
	roomCode := c.Param("roomCode")

	// Validate room code format
	if len(roomCode) != 6 {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_ROOM_CODE",
			"message": "Room code must be 6 characters",
		})
		return
	}

	// Parse request body
	var req UpdateRoomVisibilityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_REQUEST",
			"message": err.Error(),
		})
		return
	}

	// Get player ID from context (set by authentication middleware or join logic)
	// For now, we'll get it from query parameter or header for testing
	playerID := c.Query("playerId")
	if playerID == "" {
		playerID = c.GetHeader("X-Player-ID")
	}

	if playerID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    "UNAUTHORIZED",
			"message": "Player ID required",
		})
		return
	}

	// Update visibility
	room, err := h.roomService.UpdateRoomVisibility(roomCode, playerID, req.IsPublic)
	if err != nil {
		if err.Error() == "only the room owner can change visibility" {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "FORBIDDEN",
				"message": err.Error(),
			})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{
			"code":    "ROOM_NOT_FOUND",
			"message": "Room not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":     room.Code,
		"isPublic": room.IsPublic,
		"message":  "Room visibility updated successfully",
	})
}

// parseIntParam parses an integer query parameter
func parseIntParam(value string, paramName string) (int, error) {
	result, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("invalid %s parameter: must be an integer", paramName)
	}
	return result, nil
}
