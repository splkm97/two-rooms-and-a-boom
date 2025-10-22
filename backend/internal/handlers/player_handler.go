package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/services"
)

// PlayerHandler handles player-related HTTP requests
type PlayerHandler struct {
	playerService *services.PlayerService
}

// NewPlayerHandler creates a new PlayerHandler instance
func NewPlayerHandler(playerService *services.PlayerService) *PlayerHandler {
	return &PlayerHandler{
		playerService: playerService,
	}
}

// UpdateNicknameRequest represents the request body for updating nickname
type UpdateNicknameRequest struct {
	Nickname string `json:"nickname" binding:"required"`
}

// T040: Create POST /api/v1/rooms/{roomCode}/players handler
func (h *PlayerHandler) JoinRoom(c *gin.Context) {
	roomCode := c.Param("roomCode")

	player, err := h.playerService.JoinRoom(roomCode)
	if err != nil {
		switch err {
		case models.ErrRoomNotFound:
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "ROOM_NOT_FOUND",
				"message": "Room not found",
			})
		case models.ErrRoomFull:
			c.JSON(http.StatusConflict, gin.H{
				"code":    "ROOM_FULL",
				"message": "Room is full",
			})
		case models.ErrGameAlreadyStarted:
			c.JSON(http.StatusConflict, gin.H{
				"code":    "GAME_ALREADY_STARTED",
				"message": "Game already started",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "JOIN_ROOM_FAILED",
				"message": err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusCreated, player)
}

// T041: Create PATCH /api/v1/rooms/{roomCode}/players/{playerId}/nickname handler
func (h *PlayerHandler) UpdateNickname(c *gin.Context) {
	roomCode := c.Param("roomCode")
	playerID := c.Param("playerId")

	var req UpdateNicknameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_REQUEST",
			"message": err.Error(),
		})
		return
	}

	player, err := h.playerService.UpdateNickname(roomCode, playerID, req.Nickname)
	if err != nil {
		switch err {
		case models.ErrRoomNotFound:
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "ROOM_NOT_FOUND",
				"message": "Room not found",
			})
		case models.ErrPlayerNotFound:
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "PLAYER_NOT_FOUND",
				"message": "Player not found",
			})
		case models.ErrInvalidNickname:
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "INVALID_NICKNAME",
				"message": "Nickname must be between 2 and 20 characters",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    "UPDATE_NICKNAME_FAILED",
				"message": err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, player)
}
