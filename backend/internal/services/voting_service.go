package services

import (
	"errors"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
	"github.com/kalee/two-rooms-and-a-boom/internal/websocket"
)

// VotingService manages leader removal votes
type VotingService struct {
	store         *store.RoomStore
	hub           *websocket.Hub
	leaderService *LeaderService
	sessions      map[string]*models.VoteSession // voteID -> session
	roomVotes     map[string]string              // roomCode+roomColor -> voteID (active vote)
	mu            sync.RWMutex
}

// NewVotingService creates a new VotingService instance
func NewVotingService(store *store.RoomStore, hub *websocket.Hub, leaderService *LeaderService) *VotingService {
	vs := &VotingService{
		store:         store,
		hub:           hub,
		leaderService: leaderService,
		sessions:      make(map[string]*models.VoteSession),
		roomVotes:     make(map[string]string),
	}

	// Start cleanup goroutine
	go vs.cleanupExpiredSessions()

	return vs
}

// StartVote initiates a leader removal vote
func (vs *VotingService) StartVote(roomCode, initiatorID, targetLeaderID string, roomColor models.RoomColor) (string, error) {
	room, err := vs.store.Get(roomCode)
	if err != nil {
		return "", err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return "", errors.New("no active round")
	}

	roundState := room.GameSession.RoundState

	// Validation: Not in SELECTING phase
	if roundState.Status == models.RoundStatusSelecting {
		return "", errors.New("cannot start vote during hostage selection")
	}

	// Find initiator and target leader
	var initiator, targetLeader *models.Player
	var roomPlayers []*models.Player

	for _, player := range room.Players {
		if player.ID == initiatorID {
			initiator = player
		}
		if player.ID == targetLeaderID {
			targetLeader = player
		}
		if player.CurrentRoom == roomColor {
			roomPlayers = append(roomPlayers, player)
		}
	}

	// Validation: Initiator exists and is in the room
	if initiator == nil {
		return "", errors.New("initiator not found")
	}

	if initiator.CurrentRoom != roomColor {
		return "", errors.New("initiator not in specified room")
	}

	// Validation: Initiator is not the leader
	if vs.leaderService.IsLeader(roomCode, initiatorID) {
		return "", errors.New("leader cannot vote to remove themselves")
	}

	// Validation: Target is actually a leader
	if !vs.leaderService.IsLeader(roomCode, targetLeaderID) {
		return "", errors.New("target is not a leader")
	}

	// Validation: Target leader is in the room
	if targetLeader == nil || targetLeader.CurrentRoom != roomColor {
		return "", errors.New("target leader not in specified room")
	}

	// Validation: Minimum 3 players in room
	if len(roomPlayers) < 3 {
		return "", errors.New("minimum 3 players required to start vote")
	}

	// Validation: No active vote in this room
	if vs.HasActiveVote(roomCode, roomColor) {
		return "", errors.New("another vote is already in progress")
	}

	// Create vote session
	voteID := uuid.New().String()
	now := time.Now()
	expiresAt := now.Add(30 * time.Second)

	session := &models.VoteSession{
		VoteID:           voteID,
		GameSessionID:    room.GameSession.ID,
		RoomColor:        roomColor,
		TargetLeaderID:   targetLeaderID,
		TargetLeaderName: targetLeader.Nickname,
		InitiatorID:      initiatorID,
		InitiatorName:    initiator.Nickname,
		StartedAt:        now,
		ExpiresAt:        expiresAt,
		TimeoutSeconds:   30,
		TotalVoters:      len(roomPlayers),
		Votes:            make(map[string]models.VoteChoice),
		Status:           models.VoteStatusActive,
	}

	// Store session
	vs.mu.Lock()
	vs.sessions[voteID] = session
	roomKey := getRoomVoteKey(roomCode, roomColor)
	vs.roomVotes[roomKey] = voteID
	vs.mu.Unlock()

	log.Printf("[INFO] Vote started: room=%s voteID=%s target=%s initiator=%s voters=%d",
		roomCode, voteID, targetLeader.Nickname, initiator.Nickname, len(roomPlayers))

	// Broadcast VOTE_SESSION_STARTED
	payload := &websocket.VoteSessionStartedPayload{
		VoteID:    voteID,
		RoomColor: roomColor,
		TargetLeader: &websocket.LeaderInfo{
			ID:       targetLeaderID,
			Nickname: targetLeader.Nickname,
		},
		Initiator: &websocket.LeaderInfo{
			ID:       initiatorID,
			Nickname: initiator.Nickname,
		},
		TotalVoters:    len(roomPlayers),
		TimeoutSeconds: 30,
		StartedAt:      now.Format(time.RFC3339),
	}

	msg, err := websocket.NewMessage(websocket.MessageVoteSessionStarted, payload)
	if err != nil {
		return "", err
	}

	data, _ := msg.Marshal()
	vs.hub.BroadcastToRoom(roomCode, data)

	// Start timeout goroutine
	go vs.handleVoteTimeout(voteID, roomCode, 30*time.Second)

	return voteID, nil
}

// CastVote records a player's vote
func (vs *VotingService) CastVote(roomCode, voteID, playerID string, vote models.VoteChoice) error {
	vs.mu.Lock()
	session, exists := vs.sessions[voteID]
	if !exists {
		vs.mu.Unlock()
		return errors.New("vote session not found")
	}

	// Validate vote is active
	if session.Status != models.VoteStatusActive {
		vs.mu.Unlock()
		return errors.New("vote session is not active")
	}

	// Validate player hasn't already voted
	if _, hasVoted := session.Votes[playerID]; hasVoted {
		vs.mu.Unlock()
		return errors.New("player has already voted")
	}

	// Validate vote choice
	if vote != models.VoteYes && vote != models.VoteNo {
		vs.mu.Unlock()
		return errors.New("invalid vote choice")
	}

	// Record vote
	session.Votes[playerID] = vote
	vs.mu.Unlock()

	log.Printf("[INFO] Vote cast: voteID=%s playerID=%s vote=%s (%d/%d)",
		voteID, playerID, vote, len(session.Votes), session.TotalVoters)

	// Broadcast VOTE_PROGRESS
	timeRemaining := int(time.Until(session.ExpiresAt).Seconds())
	if timeRemaining < 0 {
		timeRemaining = 0
	}

	progressPayload := &websocket.VoteProgressPayload{
		VoteID:        voteID,
		VotedCount:    len(session.Votes),
		TotalVoters:   session.TotalVoters,
		TimeRemaining: timeRemaining,
	}

	msg, err := websocket.NewMessage(websocket.MessageVoteProgress, progressPayload)
	if err != nil {
		return err
	}

	data, _ := msg.Marshal()
	vs.hub.BroadcastToRoom(roomCode, data)

	// Check if all players have voted
	if len(session.Votes) == session.TotalVoters {
		log.Printf("[INFO] All players voted: voteID=%s completing vote", voteID)
		go vs.CompleteVote(roomCode, voteID)
	}

	return nil
}

// CompleteVote calculates vote result and triggers leader change if needed
func (vs *VotingService) CompleteVote(roomCode, voteID string) error {
	vs.mu.Lock()
	session, exists := vs.sessions[voteID]
	if !exists {
		vs.mu.Unlock()
		return errors.New("vote session not found")
	}

	// Check if already completed
	if session.Status != models.VoteStatusActive {
		vs.mu.Unlock()
		return nil
	}

	// Mark as completed
	session.Status = models.VoteStatusCompleted
	vs.mu.Unlock()

	// Calculate results
	yesVotes := 0
	noVotes := 0

	for _, vote := range session.Votes {
		if vote == models.VoteYes {
			yesVotes++
		} else {
			noVotes++
		}
	}

	// Determine result (>50% YES to pass)
	result := models.VoteResultFailed
	var newLeader *models.Player
	var err error

	if yesVotes > session.TotalVoters/2 {
		result = models.VoteResultPassed

		// Assign new leader
		newLeader, err = vs.leaderService.AssignNewLeader(roomCode, session.RoomColor, session.TargetLeaderID)
		if err != nil {
			log.Printf("[ERROR] Failed to assign new leader after vote: %v", err)
			result = models.VoteResultFailed
		}
	}

	// Clean up
	vs.mu.Lock()
	roomKey := getRoomVoteKey(roomCode, session.RoomColor)
	delete(vs.roomVotes, roomKey)
	vs.mu.Unlock()

	log.Printf("[INFO] Vote completed: voteID=%s result=%s yes=%d no=%d",
		voteID, result, yesVotes, noVotes)

	// Get target leader info
	room, err := vs.store.Get(roomCode)
	if err != nil {
		return err
	}

	var targetLeaderInfo *websocket.LeaderInfo
	for _, player := range room.Players {
		if player.ID == session.TargetLeaderID {
			targetLeaderInfo = &websocket.LeaderInfo{
				ID:       player.ID,
				Nickname: player.Nickname,
			}
			break
		}
	}

	// Broadcast VOTE_COMPLETED
	completedPayload := &websocket.VoteCompletedPayload{
		VoteID:       voteID,
		Result:       result,
		YesVotes:     yesVotes,
		NoVotes:      noVotes,
		TargetLeader: targetLeaderInfo,
	}

	if newLeader != nil {
		completedPayload.NewLeader = &websocket.LeaderInfo{
			ID:       newLeader.ID,
			Nickname: newLeader.Nickname,
		}
		completedPayload.Reason = "MAJORITY_VOTE"
	}

	msg, err := websocket.NewMessage(websocket.MessageVoteCompleted, completedPayload)
	if err != nil {
		return err
	}

	data, _ := msg.Marshal()
	vs.hub.BroadcastToRoom(roomCode, data)

	// If vote passed, broadcast LEADERSHIP_CHANGED
	if result == models.VoteResultPassed && newLeader != nil {
		leadershipPayload := &websocket.LeadershipChangedPayload{
			RoomColor: session.RoomColor,
			OldLeader: targetLeaderInfo,
			NewLeader: &websocket.LeaderInfo{
				ID:       newLeader.ID,
				Nickname: newLeader.Nickname,
			},
			Reason:    models.ReasonVoteRemoval,
			Timestamp: time.Now().Format(time.RFC3339),
		}

		leaderMsg, _ := websocket.NewMessage(websocket.MessageLeadershipChanged, leadershipPayload)
		leaderData, _ := leaderMsg.Marshal()
		vs.hub.BroadcastToRoom(roomCode, leaderData)
	}

	return nil
}

// handleVoteTimeout handles vote timeout after 30 seconds
func (vs *VotingService) handleVoteTimeout(voteID, roomCode string, timeout time.Duration) {
	time.Sleep(timeout)

	vs.mu.Lock()
	session, exists := vs.sessions[voteID]
	if !exists || session.Status != models.VoteStatusActive {
		vs.mu.Unlock()
		return
	}

	// Mark as timeout
	session.Status = models.VoteStatusTimeout
	roomKey := getRoomVoteKey(roomCode, session.RoomColor)
	delete(vs.roomVotes, roomKey)
	vs.mu.Unlock()

	log.Printf("[INFO] Vote timed out: voteID=%s voted=%d/%d",
		voteID, len(session.Votes), session.TotalVoters)

	// Calculate partial results
	yesVotes := 0
	noVotes := 0

	for _, vote := range session.Votes {
		if vote == models.VoteYes {
			yesVotes++
		} else {
			noVotes++
		}
	}

	// Get target leader info
	room, err := vs.store.Get(roomCode)
	if err != nil {
		return
	}

	var targetLeaderInfo *websocket.LeaderInfo
	for _, player := range room.Players {
		if player.ID == session.TargetLeaderID {
			targetLeaderInfo = &websocket.LeaderInfo{
				ID:       player.ID,
				Nickname: player.Nickname,
			}
			break
		}
	}

	// Broadcast VOTE_COMPLETED with TIMEOUT result
	payload := &websocket.VoteCompletedPayload{
		VoteID:       voteID,
		Result:       models.VoteResultTimeout,
		YesVotes:     yesVotes,
		NoVotes:      noVotes,
		TargetLeader: targetLeaderInfo,
		Reason:       "TIMEOUT",
	}

	msg, err := websocket.NewMessage(websocket.MessageVoteCompleted, payload)
	if err != nil {
		return
	}

	data, _ := msg.Marshal()
	vs.hub.BroadcastToRoom(roomCode, data)
}

// GetVoteSession retrieves a vote session by ID
func (vs *VotingService) GetVoteSession(voteID string) (*models.VoteSession, error) {
	vs.mu.RLock()
	defer vs.mu.RUnlock()

	session, exists := vs.sessions[voteID]
	if !exists {
		return nil, errors.New("vote session not found")
	}

	return session, nil
}

// HasActiveVote checks if there's an active vote in a room
func (vs *VotingService) HasActiveVote(roomCode string, roomColor models.RoomColor) bool {
	vs.mu.RLock()
	defer vs.mu.RUnlock()

	roomKey := getRoomVoteKey(roomCode, roomColor)
	voteID, exists := vs.roomVotes[roomKey]
	if !exists {
		return false
	}

	session, exists := vs.sessions[voteID]
	return exists && session.Status == models.VoteStatusActive
}

// CanStartVote checks if a vote can be started
func (vs *VotingService) CanStartVote(roomCode string, roomColor models.RoomColor) bool {
	room, err := vs.store.Get(roomCode)
	if err != nil {
		return false
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return false
	}

	// Cannot start during SELECTING phase
	if room.GameSession.RoundState.Status == models.RoundStatusSelecting {
		return false
	}

	// No active vote
	return !vs.HasActiveVote(roomCode, roomColor)
}

// cleanupExpiredSessions removes expired vote sessions
func (vs *VotingService) cleanupExpiredSessions() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		vs.mu.Lock()
		now := time.Now()

		for voteID, session := range vs.sessions {
			// Remove sessions older than 5 minutes
			if now.Sub(session.StartedAt) > 5*time.Minute {
				delete(vs.sessions, voteID)
				log.Printf("[INFO] Cleaned up expired vote session: voteID=%s", voteID)
			}
		}

		vs.mu.Unlock()
	}
}

// getRoomVoteKey generates a unique key for room+color
func getRoomVoteKey(roomCode string, roomColor models.RoomColor) string {
	return roomCode + ":" + string(roomColor)
}
