package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/services"
)

// GameHandler handles game-related HTTP requests
type GameHandler struct {
	gameService *services.GameService
}

// NewGameHandler creates a new GameHandler instance
func NewGameHandler(gameService *services.GameService) *GameHandler {
	return &GameHandler{
		gameService: gameService,
	}
}

// T073: Create POST /api/v1/rooms/{roomCode}/game/start handler
func (h *GameHandler) StartGame(c *gin.Context) {
	roomCode := c.Param("roomCode")

	// Validate room code format (6 characters)
	if len(roomCode) != 6 {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_ROOM_CODE",
			"message": "Room code must be 6 characters",
		})
		return
	}

	// Start the game
	_, err := h.gameService.StartGame(roomCode)
	if err != nil {
		// Handle specific error types
		if err.Error() == "room not found" || err == models.ErrRoomNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "ROOM_NOT_FOUND",
				"message": "Room not found",
			})
			return
		}

		if err.Error() == "game already started" {
			c.JSON(http.StatusConflict, gin.H{
				"code":    "GAME_ALREADY_STARTED",
				"message": "Game has already started",
			})
			return
		}

		if err.Error() == "insufficient players: minimum 6 required" {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "INSUFFICIENT_PLAYERS",
				"message": "At least 6 players required to start game",
			})
			return
		}

		// Generic error
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "START_GAME_FAILED",
			"message": err.Error(),
		})
		return
	}

	// Get updated room to return full state
	room, err := h.gameService.GetRoom(roomCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "GET_ROOM_FAILED",
			"message": "Game started but failed to retrieve room state",
		})
		return
	}

	// Return room with game session
	c.JSON(http.StatusOK, room)
}

// T090: Create POST /api/v1/rooms/{roomCode}/game/reset handler
func (h *GameHandler) ResetGame(c *gin.Context) {
	roomCode := c.Param("roomCode")

	// Validate room code format (6 characters)
	if len(roomCode) != 6 {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_ROOM_CODE",
			"message": "Room code must be 6 characters",
		})
		return
	}

	// Reset the game
	err := h.gameService.ResetGame(roomCode)
	if err != nil {
		// Handle specific error types
		if err.Error() == "room not found" || err == models.ErrRoomNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    "ROOM_NOT_FOUND",
				"message": "Room not found",
			})
			return
		}

		if err.Error() == "game not started" {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    "GAME_NOT_STARTED",
				"message": "Game has not been started yet",
			})
			return
		}

		// Generic error
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "RESET_GAME_FAILED",
			"message": err.Error(),
		})
		return
	}

	// Get updated room to return full state
	room, err := h.gameService.GetRoom(roomCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "GET_ROOM_FAILED",
			"message": "Game reset but failed to retrieve room state",
		})
		return
	}

	// Return room with reset state
	c.JSON(http.StatusOK, room)
}
