package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/services"
)

// RoundHandler handles round-related HTTP requests
type RoundHandler struct {
	roundManager    *services.RoundManager
	leaderService   *services.LeaderService
	votingService   *services.VotingService
	exchangeService *services.ExchangeService
}

// NewRoundHandler creates a new RoundHandler instance
func NewRoundHandler(
	roundManager *services.RoundManager,
	leaderService *services.LeaderService,
	votingService *services.VotingService,
	exchangeService *services.ExchangeService,
) *RoundHandler {
	return &RoundHandler{
		roundManager:    roundManager,
		leaderService:   leaderService,
		votingService:   votingService,
		exchangeService: exchangeService,
	}
}

// StartRoundRequest represents the request to start a round
type StartRoundRequest struct {
	RoundNumber int `json:"roundNumber" binding:"required,min=1,max=3"`
}

// StartRound starts a new round
// POST /api/v1/rooms/:roomCode/rounds/start
func (h *RoundHandler) StartRound(c *gin.Context) {
	roomCode := c.Param("roomCode")

	var req StartRoundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	// Start round
	if err := h.roundManager.StartRound(roomCode, req.RoundNumber); err != nil {
		log.Printf("[ERROR] Failed to start round: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Assign leaders
	if err := h.leaderService.AssignLeaders(roomCode); err != nil {
		log.Printf("[ERROR] Failed to assign leaders: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to assign leaders"})
		return
	}

	// Get round state for response
	roundState, err := h.roundManager.GetRoundState(roomCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get round state"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"roundNumber":  roundState.RoundNumber,
		"duration":     roundState.Duration,
		"redLeader":    roundState.RedLeaderID,
		"blueLeader":   roundState.BlueLeaderID,
		"hostageCount": roundState.HostageCount,
	})
}

// GetCurrentRound gets the current round state
// GET /api/v1/rooms/:roomCode/rounds/current
func (h *RoundHandler) GetCurrentRound(c *gin.Context) {
	roomCode := c.Param("roomCode")

	roundState, err := h.roundManager.GetRoundState(roomCode)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	redSelected := len(roundState.RedHostages) > 0
	blueSelected := len(roundState.BlueHostages) > 0

	c.JSON(http.StatusOK, gin.H{
		"roundNumber":          roundState.RoundNumber,
		"timeRemaining":        roundState.TimeRemaining,
		"duration":             roundState.Duration,
		"status":               roundState.Status,
		"redLeader":            roundState.RedLeaderID,
		"blueLeader":           roundState.BlueLeaderID,
		"hostageCount":         roundState.HostageCount,
		"redHostagesSelected":  redSelected,
		"blueHostagesSelected": blueSelected,
	})
}

// TransferLeadershipRequest represents leadership transfer request
type TransferLeadershipRequest struct {
	NewLeaderID string `json:"newLeaderId" binding:"required"`
}

// TransferLeadership voluntarily transfers leadership
// POST /api/v1/rooms/:roomCode/leaders/transfer
func (h *RoundHandler) TransferLeadership(c *gin.Context) {
	roomCode := c.Param("roomCode")
	currentLeaderID := c.GetHeader("X-Player-ID")

	if currentLeaderID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "player ID required"})
		return
	}

	var req TransferLeadershipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	if err := h.leaderService.TransferLeadership(roomCode, currentLeaderID, req.NewLeaderID); err != nil {
		log.Printf("[ERROR] Failed to transfer leadership: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "leadership transferred"})
}

// StartVoteRequest represents vote initiation request
type StartVoteRequest struct {
	RoomColor      string `json:"roomColor" binding:"required"`
	TargetLeaderID string `json:"targetLeaderId" binding:"required"`
}

// StartVote initiates a leader removal vote
// POST /api/v1/rooms/:roomCode/votes/start
func (h *RoundHandler) StartVote(c *gin.Context) {
	roomCode := c.Param("roomCode")
	initiatorID := c.GetHeader("X-Player-ID")

	if initiatorID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "player ID required"})
		return
	}

	var req StartVoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	// Convert room color string to type
	var roomColor models.RoomColor
	if req.RoomColor == "RED_ROOM" {
		roomColor = models.RedRoom
	} else if req.RoomColor == "BLUE_ROOM" {
		roomColor = models.BlueRoom
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room color"})
		return
	}

	voteID, err := h.votingService.StartVote(roomCode, initiatorID, req.TargetLeaderID, roomColor)
	if err != nil {
		log.Printf("[ERROR] Failed to start vote: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"voteId": voteID,
	})
}

// CastVoteRequest represents vote casting request
type CastVoteRequest struct {
	Vote string `json:"vote" binding:"required"`
}

// CastVote casts a vote in an active vote session
// POST /api/v1/rooms/:roomCode/votes/:voteId/cast
func (h *RoundHandler) CastVote(c *gin.Context) {
	roomCode := c.Param("roomCode")
	voteID := c.Param("voteId")
	playerID := c.GetHeader("X-Player-ID")

	if playerID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "player ID required"})
		return
	}

	var req CastVoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	// Convert vote string to type
	var vote models.VoteChoice
	if req.Vote == "YES" {
		vote = models.VoteYes
	} else if req.Vote == "NO" {
		vote = models.VoteNo
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vote choice"})
		return
	}

	if err := h.votingService.CastVote(roomCode, voteID, playerID, vote); err != nil {
		log.Printf("[ERROR] Failed to cast vote: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "vote cast"})
}

// SelectHostagesRequest represents hostage selection request
type SelectHostagesRequest struct {
	HostageIDs []string `json:"hostageIds" binding:"required"`
}

// SelectHostages allows a leader to select hostages
// POST /api/v1/rooms/:roomCode/hostages/select
func (h *RoundHandler) SelectHostages(c *gin.Context) {
	roomCode := c.Param("roomCode")
	leaderID := c.GetHeader("X-Player-ID")

	if leaderID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "player ID required"})
		return
	}

	var req SelectHostagesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	if err := h.exchangeService.SelectHostages(roomCode, leaderID, req.HostageIDs); err != nil {
		log.Printf("[ERROR] Failed to select hostages: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "hostages selected"})
}

// RegisterRoutes registers round-related routes
func (h *RoundHandler) RegisterRoutes(router *gin.Engine) {
	api := router.Group("/api/v1")
	{
		rooms := api.Group("/rooms/:roomCode")
		{
			// Round management
			rooms.POST("/rounds/start", h.StartRound)
			rooms.GET("/rounds/current", h.GetCurrentRound)

			// Leadership
			rooms.POST("/leaders/transfer", h.TransferLeadership)

			// Voting
			rooms.POST("/votes/start", h.StartVote)
			rooms.POST("/votes/:voteId/cast", h.CastVote)

			// Hostage exchange
			rooms.POST("/hostages/select", h.SelectHostages)
		}
	}
}
