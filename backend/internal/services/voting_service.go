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
		VoteType:         models.VoteTypeRemoval,
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
		Votes:            make(map[string]string),
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

	// Broadcast to players in the specific room color (PRIVATE event)
	playerIDs, err := vs.getPlayerIDsInRoomColor(roomCode, roomColor)
	if err == nil {
		vs.hub.BroadcastToRoomColor(roomCode, playerIDs, data)
	}

	// Start timeout goroutine
	go vs.handleVoteTimeout(voteID, roomCode, 30*time.Second)

	return voteID, nil
}

// CastVote records a player's vote
func (vs *VotingService) CastVote(roomCode, voteID, playerID string, vote string) error {
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

	// Validate vote choice based on vote type
	if session.VoteType == models.VoteTypeRemoval {
		if vote != string(models.VoteYes) && vote != string(models.VoteNo) {
			vs.mu.Unlock()
			return errors.New("invalid vote choice for removal vote")
		}
	} else if session.VoteType == models.VoteTypeElection {
		// For election, vote should be a candidate ID
		validCandidate := false
		for _, candidateID := range session.Candidates {
			if vote == candidateID {
				validCandidate = true
				break
			}
		}
		if !validCandidate {
			vs.mu.Unlock()
			return errors.New("invalid candidate ID")
		}
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

	// Broadcast to players in the specific room color (PRIVATE event)
	playerIDs, err := vs.getPlayerIDsInRoomColor(roomCode, session.RoomColor)
	if err == nil {
		vs.hub.BroadcastToRoomColor(roomCode, playerIDs, data)
	}

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

	// Calculate results based on vote type
	result := models.VoteResultFailed
	var newLeader *models.Player
	var err error
	yesVotes := 0
	noVotes := 0

	if session.VoteType == models.VoteTypeRemoval {
		// Calculate YES/NO votes for removal
		for _, vote := range session.Votes {
			if vote == string(models.VoteYes) {
				yesVotes++
			} else {
				noVotes++
			}
		}

		// Determine result (>50% YES to pass)
		if yesVotes > session.TotalVoters/2 {
			result = models.VoteResultPassed
			// Note: Election vote will be started after broadcasting VOTE_COMPLETED
			// to ensure proper sequencing and avoid race conditions
		}
	} else if session.VoteType == models.VoteTypeElection {
		// Count votes for each candidate
		voteCounts := make(map[string]int)
		for _, vote := range session.Votes {
			voteCounts[vote]++
		}

		// Find candidate with most votes
		var winnerID string
		maxVotes := 0
		for candidateID, count := range voteCounts {
			if count > maxVotes {
				maxVotes = count
				winnerID = candidateID
			}
		}

		if winnerID != "" {
			result = models.VoteResultPassed
			// Assign the elected leader
			newLeader, err = vs.leaderService.SetLeader(roomCode, session.RoomColor, winnerID)
			if err != nil {
				log.Printf("[ERROR] Failed to assign elected leader: %v", err)
				result = models.VoteResultFailed
			}
		}
	}

	// Clean up - but only if NOT starting an election vote
	// For removal votes that pass, we'll let the election vote handle cleanup
	shouldCleanup := !(session.VoteType == models.VoteTypeRemoval && result == models.VoteResultPassed)

	if shouldCleanup {
		vs.mu.Lock()
		roomKey := getRoomVoteKey(roomCode, session.RoomColor)
		delete(vs.roomVotes, roomKey)
		vs.mu.Unlock()
	}

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

	// Broadcast to players in the specific room color (PRIVATE event)
	playerIDs, err := vs.getPlayerIDsInRoomColor(roomCode, session.RoomColor)
	if err == nil {
		vs.hub.BroadcastToRoomColor(roomCode, playerIDs, data)
	}

	// If vote passed, broadcast LEADERSHIP_CHANGED (also PRIVATE)
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

		// Also broadcast to room color only
		if err == nil {
			vs.hub.BroadcastToRoomColor(roomCode, playerIDs, leaderData)
		}
	}

	// If removal vote passed, start election vote after delay
	// Wait 7 seconds to give players time to see the result and prepare for election
	if session.VoteType == models.VoteTypeRemoval && result == models.VoteResultPassed {
		log.Printf("[INFO] Removal passed, will start election after 7 second delay: room=%s", roomCode)
		time.Sleep(7 * time.Second) // Give players time to see result and prepare

		if _, err := vs.StartElectionVote(roomCode, session.RoomColor, session.TargetLeaderID); err != nil {
			log.Printf("[ERROR] Failed to start election vote: %v", err)
			// Clean up the old vote entry if election failed to start
			vs.mu.Lock()
			roomKey := getRoomVoteKey(roomCode, session.RoomColor)
			delete(vs.roomVotes, roomKey)
			vs.mu.Unlock()
		}
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

	log.Printf("[INFO] Vote timed out: voteID=%s voted=%d/%d type=%s",
		voteID, len(session.Votes), session.TotalVoters, session.VoteType)

	// Calculate partial results
	yesVotes := 0
	noVotes := 0
	removalPassed := false

	if session.VoteType == models.VoteTypeRemoval {
		for _, vote := range session.Votes {
			if vote == string(models.VoteYes) {
				yesVotes++
			} else {
				noVotes++
			}
		}

		// Check if removal passes despite timeout (YES > NO)
		if yesVotes > noVotes {
			removalPassed = true
			log.Printf("[INFO] Removal vote passed on timeout: YES=%d > NO=%d", yesVotes, noVotes)
		}
	} else if session.VoteType == models.VoteTypeElection {
		// For election timeout, pick the candidate with most votes
		voteCounts := make(map[string]int)
		for _, vote := range session.Votes {
			voteCounts[vote]++
		}

		var winnerID string
		maxVotes := 0
		for candidateID, count := range voteCounts {
			if count > maxVotes {
				maxVotes = count
				winnerID = candidateID
			}
		}

		// If there's a winner, assign them as leader
		if winnerID != "" {
			if newLeader, err := vs.leaderService.SetLeader(roomCode, session.RoomColor, winnerID); err == nil {
				log.Printf("[INFO] Leader elected after timeout: %s", newLeader.Nickname)
			}
		}
	}

	// Get target leader info
	room, err := vs.store.Get(roomCode)
	if err != nil {
		return
	}

	var targetLeaderInfo *websocket.LeaderInfo
	if session.TargetLeaderID != "" {
		for _, player := range room.Players {
			if player.ID == session.TargetLeaderID {
				targetLeaderInfo = &websocket.LeaderInfo{
					ID:       player.ID,
					Nickname: player.Nickname,
				}
				break
			}
		}
	}

	// Determine result based on removal status
	voteResult := models.VoteResultTimeout
	reason := "TIMEOUT"
	if removalPassed {
		voteResult = models.VoteResultPassed
		reason = "PASSED_ON_TIMEOUT"
	}

	// Broadcast VOTE_COMPLETED with appropriate result
	payload := &websocket.VoteCompletedPayload{
		VoteID:       voteID,
		Result:       voteResult,
		YesVotes:     yesVotes,
		NoVotes:      noVotes,
		TargetLeader: targetLeaderInfo,
		Reason:       reason,
	}

	msg, err := websocket.NewMessage(websocket.MessageVoteCompleted, payload)
	if err != nil {
		return
	}

	data, _ := msg.Marshal()

	// Broadcast to players in the specific room color (PRIVATE event)
	playerIDs, err := vs.getPlayerIDsInRoomColor(roomCode, session.RoomColor)
	if err == nil {
		vs.hub.BroadcastToRoomColor(roomCode, playerIDs, data)
	}

	// If removal passed on timeout, trigger election vote
	if removalPassed {
		log.Printf("[INFO] Triggering election vote after timeout removal: room=%s", roomCode)
		time.Sleep(7 * time.Second) // Wait 7 seconds for UI to show result and give players time to prepare

		if _, err := vs.StartElectionVote(roomCode, session.RoomColor, session.TargetLeaderID); err != nil {
			log.Printf("[ERROR] Failed to start election after timeout: %v", err)
		}
	}
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

// getPlayerIDsInRoomColor gets all player IDs in a specific room color
func (vs *VotingService) getPlayerIDsInRoomColor(roomCode string, roomColor models.RoomColor) ([]string, error) {
	room, err := vs.store.Get(roomCode)
	if err != nil {
		return nil, err
	}

	var playerIDs []string
	for _, player := range room.Players {
		if player.CurrentRoom == roomColor {
			playerIDs = append(playerIDs, player.ID)
		}
	}

	return playerIDs, nil
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

// GetActiveVoteForRoom returns the active vote session for a specific room color
func (vs *VotingService) GetActiveVoteForRoom(roomCode string, roomColor models.RoomColor) (*models.VoteSession, error) {
	vs.mu.RLock()
	defer vs.mu.RUnlock()

	roomKey := getRoomVoteKey(roomCode, roomColor)
	voteID, exists := vs.roomVotes[roomKey]
	if !exists {
		return nil, nil // No active vote, not an error
	}

	session, exists := vs.sessions[voteID]
	if !exists || session.Status != models.VoteStatusActive {
		return nil, nil // Session expired or completed
	}

	return session, nil
}

// StartElectionVote initiates a leader election vote
func (vs *VotingService) StartElectionVote(roomCode string, roomColor models.RoomColor, excludePlayerID string) (string, error) {
	room, err := vs.store.Get(roomCode)
	if err != nil {
		return "", err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return "", errors.New("no active round")
	}

	// Get eligible candidates (all players in room except removed leader)
	var candidates []*models.Player
	var removedLeader *models.Player
	for _, player := range room.Players {
		if player.CurrentRoom == roomColor {
			if player.ID == excludePlayerID {
				removedLeader = player
			} else {
				candidates = append(candidates, player)
			}
		}
	}

	if len(candidates) == 0 {
		return "", errors.New("no eligible candidates")
	}

	// Create election vote session
	voteID := uuid.New().String()
	now := time.Now()
	expiresAt := now.Add(30 * time.Second)

	candidateIDs := make([]string, len(candidates))
	for i, candidate := range candidates {
		candidateIDs[i] = candidate.ID
	}

	session := &models.VoteSession{
		VoteID:         voteID,
		VoteType:       models.VoteTypeElection,
		GameSessionID:  room.GameSession.ID,
		RoomColor:      roomColor,
		InitiatorID:    "",  // System-initiated
		InitiatorName:  "시스템", // System
		Candidates:     candidateIDs,
		StartedAt:      now,
		ExpiresAt:      expiresAt,
		TimeoutSeconds: 30,
		TotalVoters:    len(candidates), // All candidates can vote
		Votes:          make(map[string]string),
		Status:         models.VoteStatusActive,
	}

	// Store session - this atomically replaces any previous vote for this room
	// When called after a removal vote, this ensures zero race condition for refreshing players
	vs.mu.Lock()
	vs.sessions[voteID] = session
	roomKey := getRoomVoteKey(roomCode, roomColor)
	vs.roomVotes[roomKey] = voteID // Atomically replaces the removal vote entry
	vs.mu.Unlock()

	log.Printf("[INFO] Election vote started: room=%s voteID=%s candidates=%d",
		roomCode, voteID, len(candidates))

	// Broadcast VOTE_SESSION_STARTED for election
	payload := &websocket.VoteSessionStartedPayload{
		VoteID:    voteID,
		RoomColor: roomColor,
		// For election, show the removed leader as "previous leader"
		TargetLeader: &websocket.LeaderInfo{
			ID:       excludePlayerID,
			Nickname: func() string {
				if removedLeader != nil {
					return removedLeader.Nickname
				}
				return ""
			}(),
		},
		Initiator: &websocket.LeaderInfo{
			ID:       "",
			Nickname: "시스템",
		},
		Candidates:     candidateIDs,     // Include candidate IDs for election
		TotalVoters:    len(candidates),
		TimeoutSeconds: 30,
		StartedAt:      now.Format(time.RFC3339),
	}

	msg, err := websocket.NewMessage(websocket.MessageVoteSessionStarted, payload)
	if err != nil {
		return "", err
	}

	data, _ := msg.Marshal()

	// Broadcast to players in the specific room color
	playerIDs, err := vs.getPlayerIDsInRoomColor(roomCode, roomColor)
	if err == nil {
		vs.hub.BroadcastToRoomColor(roomCode, playerIDs, data)
	}

	// Start timeout goroutine
	go vs.handleVoteTimeout(voteID, roomCode, 30*time.Second)

	return voteID, nil
}

// getRoomVoteKey generates a unique key for room+color
func getRoomVoteKey(roomCode string, roomColor models.RoomColor) string {
	return roomCode + ":" + string(roomColor)
}
