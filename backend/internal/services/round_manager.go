package services

import (
	"errors"
	"log"
	"sync"
	"time"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
	"github.com/kalee/two-rooms-and-a-boom/internal/websocket"
)

// RoundTimer represents a running round timer
type RoundTimer struct {
	sessionID string
	stopChan  chan bool
	stopped   bool
	mu        sync.Mutex
}

// RoundManager manages round lifecycle and timers
type RoundManager struct {
	hub           *websocket.Hub
	store         *store.RoomStore
	leaderService *LeaderService
	timers        map[string]*RoundTimer // sessionID -> timer
	mu            sync.RWMutex
}

// NewRoundManager creates a new RoundManager instance
func NewRoundManager(hub *websocket.Hub, store *store.RoomStore) *RoundManager {
	return &RoundManager{
		hub:    hub,
		store:  store,
		timers: make(map[string]*RoundTimer),
	}
}

// SetLeaderService sets the leader service (called after initialization to avoid circular dependencies)
func (rm *RoundManager) SetLeaderService(ls *LeaderService) {
	rm.leaderService = ls
}

// StartRound starts a new round with timer
func (rm *RoundManager) StartRound(roomCode string, roundNumber int) error {
	// Get room
	room, err := rm.store.Get(roomCode)
	if err != nil {
		return err
	}

	// Validate room has active game session
	if room.GameSession == nil {
		return errors.New("no active game session")
	}

	// Validate round number
	if roundNumber < 1 || roundNumber > 3 {
		return errors.New("invalid round number: must be 1, 2, or 3")
	}

	sessionID := room.GameSession.ID
	playerCount := len(room.Players)

	// Preserve existing leader IDs if this is not the first round
	var redLeaderID, blueLeaderID string
	if room.GameSession.RoundState != nil {
		redLeaderID = room.GameSession.RoundState.RedLeaderID
		blueLeaderID = room.GameSession.RoundState.BlueLeaderID
	}

	// Create round state
	duration := models.GetRoundDuration(roundNumber)
	hostageCount := models.GetHostageCount(playerCount, roundNumber)

	roundState := &models.RoundState{
		GameSessionID:    sessionID,
		RoundNumber:      roundNumber,
		Duration:         duration,
		TimeRemaining:    duration,
		Status:           models.RoundStatusSetup,
		HostageCount:     hostageCount,
		RedHostages:      []string{},
		BlueHostages:     []string{},
		RedLeaderID:      redLeaderID,
		BlueLeaderID:     blueLeaderID,
		RedLeaderReady:   false,
		BlueLeaderReady:  false,
		StartedAt:        time.Now(),
	}

	// Update game session
	room.GameSession.CurrentRound = roundNumber
	room.GameSession.RoundState = roundState

	if err := rm.store.Update(room); err != nil {
		return err
	}

	log.Printf("[INFO] Round %d started: room=%s sessionID=%s duration=%ds hostages=%d",
		roundNumber, roomCode, sessionID, duration, hostageCount)

	// Broadcast ROUND_STARTED event
	if err := rm.broadcastRoundStarted(room, roundState); err != nil {
		log.Printf("[ERROR] Failed to broadcast ROUND_STARTED: %v", err)
	}

	// Start timer goroutine
	if err := rm.startTimer(roomCode, sessionID, roundNumber); err != nil {
		return err
	}

	return nil
}

// broadcastRoundStarted sends ROUND_STARTED event to all players
func (rm *RoundManager) broadcastRoundStarted(room *models.Room, roundState *models.RoundState) error {
	var redLeaderInfo, blueLeaderInfo *websocket.LeaderInfo

	// Get leader info
	for _, player := range room.Players {
		if player.ID == roundState.RedLeaderID {
			redLeaderInfo = &websocket.LeaderInfo{
				ID:       player.ID,
				Nickname: player.Nickname,
			}
		}
		if player.ID == roundState.BlueLeaderID {
			blueLeaderInfo = &websocket.LeaderInfo{
				ID:       player.ID,
				Nickname: player.Nickname,
			}
		}
	}

	payload := &websocket.RoundStartedPayload{
		RoundNumber:   roundState.RoundNumber,
		Duration:      roundState.Duration,
		TimeRemaining: roundState.TimeRemaining,
		RedLeader:     redLeaderInfo,
		BlueLeader:    blueLeaderInfo,
		HostageCount:  roundState.HostageCount,
	}

	msg, err := websocket.NewMessage(websocket.MessageRoundStarted, payload)
	if err != nil {
		return err
	}

	data, _ := msg.Marshal()
	rm.hub.BroadcastToRoom(room.Code, data)

	return nil
}

// startTimer starts the timer goroutine for a round
func (rm *RoundManager) startTimer(roomCode, sessionID string, roundNumber int) error {
	// Stop existing timer if any
	rm.stopTimer(sessionID)

	// Create new timer
	timer := &RoundTimer{
		sessionID: sessionID,
		stopChan:  make(chan bool, 1),
		stopped:   false,
	}

	rm.mu.Lock()
	rm.timers[sessionID] = timer
	rm.mu.Unlock()

	// Start timer goroutine
	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				if err := rm.tickTimer(roomCode, sessionID); err != nil {
					log.Printf("[ERROR] Timer tick failed: %v", err)
					return
				}
			case <-timer.stopChan:
				log.Printf("[INFO] Timer stopped: sessionID=%s", sessionID)
				return
			}
		}
	}()

	return nil
}

// tickTimer decrements the timer and broadcasts TIMER_TICK
func (rm *RoundManager) tickTimer(roomCode, sessionID string) error {
	room, err := rm.store.Get(roomCode)
	if err != nil {
		return err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return errors.New("no active round")
	}

	roundState := room.GameSession.RoundState

	// Check if timer already expired
	if roundState.TimeRemaining <= 0 {
		return nil
	}

	// Decrement time
	roundState.TimeRemaining--

	// Update state
	if err := rm.store.Update(room); err != nil {
		return err
	}

	// Broadcast TIMER_TICK
	payload := &websocket.TimerTickPayload{
		RoundNumber:   roundState.RoundNumber,
		TimeRemaining: roundState.TimeRemaining,
	}

	msg, err := websocket.NewMessage(websocket.MessageTimerTick, payload)
	if err != nil {
		return err
	}

	data, _ := msg.Marshal()
	rm.hub.BroadcastToRoom(roomCode, data)

	// If timer expired, transition to SELECTING phase
	if roundState.TimeRemaining == 0 {
		log.Printf("[INFO] Round %d timer expired: room=%s transitioning to SELECTING",
			roundState.RoundNumber, roomCode)

		roundState.Status = models.RoundStatusSelecting
		if err := rm.store.Update(room); err != nil {
			log.Printf("[ERROR] Failed to update round status: %v", err)
		}

		// Broadcast ROUND_ENDING event
		endingPayload := &websocket.RoundEndingPayload{
			RoundNumber:  roundState.RoundNumber,
			HostageCount: roundState.HostageCount,
		}
		endingMsg, _ := websocket.NewMessage(websocket.MessageRoundEnding, endingPayload)
		endingData, _ := endingMsg.Marshal()
		rm.hub.BroadcastToRoom(roomCode, endingData)
	}

	return nil
}

// stopTimer stops the timer for a session
func (rm *RoundManager) stopTimer(sessionID string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if timer, exists := rm.timers[sessionID]; exists {
		timer.mu.Lock()
		if !timer.stopped {
			timer.stopped = true
			close(timer.stopChan)
		}
		timer.mu.Unlock()
		delete(rm.timers, sessionID)
	}
}

// EndRound ends the current round
func (rm *RoundManager) EndRound(roomCode string) error {
	room, err := rm.store.Get(roomCode)
	if err != nil {
		return err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return errors.New("no active round")
	}

	sessionID := room.GameSession.ID
	roundState := room.GameSession.RoundState

	// Stop timer
	rm.stopTimer(sessionID)

	// Mark round as complete
	now := time.Now()
	roundState.EndedAt = &now
	roundState.Status = models.RoundStatusComplete

	if err := rm.store.Update(room); err != nil {
		return err
	}

	// Broadcast ROUND_ENDED
	finalRound := roundState.RoundNumber == 3
	nextPhase := "ROUND_SETUP"
	if finalRound {
		nextPhase = "REVEALING"
	}

	payload := &websocket.RoundEndedPayload{
		RoundNumber: roundState.RoundNumber,
		FinalRound:  finalRound,
		NextPhase:   nextPhase,
	}

	msg, err := websocket.NewMessage(websocket.MessageRoundEnded, payload)
	if err != nil {
		return err
	}

	data, _ := msg.Marshal()
	rm.hub.BroadcastToRoom(roomCode, data)

	log.Printf("[INFO] Round %d ended: room=%s final=%v", roundState.RoundNumber, roomCode, finalRound)

	return nil
}

// GetRoundState retrieves the current round state
func (rm *RoundManager) GetRoundState(roomCode string) (*models.RoundState, error) {
	room, err := rm.store.Get(roomCode)
	if err != nil {
		return nil, err
	}

	if room.GameSession == nil {
		return nil, errors.New("no active game session")
	}

	if room.GameSession.RoundState == nil {
		return nil, errors.New("no active round")
	}

	return room.GameSession.RoundState, nil
}

// TransitionToExchanging transitions the round to EXCHANGING phase
func (rm *RoundManager) TransitionToExchanging(roomCode string) error {
	room, err := rm.store.Get(roomCode)
	if err != nil {
		return err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return errors.New("no active round")
	}

	room.GameSession.RoundState.Status = models.RoundStatusExchanging
	return rm.store.Update(room)
}

// LeaderReady marks a leader as ready for the next round
func (rm *RoundManager) LeaderReady(roomCode, leaderID string) error {
	room, err := rm.store.Get(roomCode)
	if err != nil {
		return err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return errors.New("no active round")
	}

	roundState := room.GameSession.RoundState

	// Verify leader
	var isRedLeader, isBlueLeader bool
	if roundState.RedLeaderID == leaderID {
		isRedLeader = true
	} else if roundState.BlueLeaderID == leaderID {
		isBlueLeader = true
	} else {
		return errors.New("player is not a leader")
	}

	// Mark leader as ready
	if isRedLeader {
		if roundState.RedLeaderReady {
			return errors.New("red leader already ready")
		}
		roundState.RedLeaderReady = true
	} else if isBlueLeader {
		if roundState.BlueLeaderReady {
			return errors.New("blue leader already ready")
		}
		roundState.BlueLeaderReady = true
	}

	if err := rm.store.Update(room); err != nil {
		return err
	}

	log.Printf("[INFO] Leader ready: room=%s leader=%s", roomCode, leaderID)

	// Broadcast LEADER_READY event
	leaderRoom := models.RedRoom
	if isBlueLeader {
		leaderRoom = models.BlueRoom
	}

	payload := &websocket.LeaderReadyPayload{
		RoomColor:  leaderRoom,
		LeaderID:   leaderID,
		BothReady:  roundState.RedLeaderReady && roundState.BlueLeaderReady,
	}

	msg, _ := websocket.NewMessage(websocket.MessageLeaderReady, payload)
	data, _ := msg.Marshal()
	rm.hub.BroadcastToRoom(roomCode, data)

	// If both leaders ready, start next round or transition to revealing
	if roundState.RedLeaderReady && roundState.BlueLeaderReady {
		log.Printf("[INFO] Both leaders ready: room=%s round=%d", roomCode, roundState.RoundNumber)

		if roundState.RoundNumber == 3 {
			// After Round 3, transition to REVEALING
			log.Printf("[INFO] Round 3 complete, transitioning to REVEALING: room=%s", roomCode)
			go rm.transitionToRevealing(roomCode)
		} else {
			// Start next round
			nextRound := roundState.RoundNumber + 1
			log.Printf("[INFO] Starting next round: room=%s round=%d", roomCode, nextRound)
			go func() {
				if err := rm.StartRound(roomCode, nextRound); err != nil {
					log.Printf("[ERROR] Failed to start next round: %v", err)
					return
				}

				// Preserve existing leaders for the new round (leaders stay the same across rounds)
				if rm.leaderService != nil {
					if err := rm.leaderService.PreserveLeaders(roomCode); err != nil {
						log.Printf("[ERROR] Failed to preserve leaders for next round: %v", err)
					}
				} else {
					log.Printf("[WARN] LeaderService not set, cannot preserve leaders")
				}
			}()
		}
	}

	return nil
}

// transitionToRevealing transitions the game to the revealing phase
func (rm *RoundManager) transitionToRevealing(roomCode string) error {
	room, err := rm.store.Get(roomCode)
	if err != nil {
		return err
	}

	if room.GameSession == nil {
		return errors.New("no active game session")
	}

	// Update game status
	room.Status = models.RoomStatusRevealing

	if err := rm.store.Update(room); err != nil {
		return err
	}

	log.Printf("[INFO] Game transitioned to REVEALING: room=%s", roomCode)

	// Broadcast GAME_REVEALING event
	payload := &websocket.GameRevealingPayload{
		Message: "모든 라운드가 종료되었습니다. 역할 공개 단계로 이동합니다.",
	}

	msg, _ := websocket.NewMessage(websocket.MessageGameRevealing, payload)
	data, _ := msg.Marshal()
	rm.hub.BroadcastToRoom(roomCode, data)

	return nil
}

// Cleanup stops all timers (called on shutdown)
func (rm *RoundManager) Cleanup() {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	for sessionID := range rm.timers {
		rm.stopTimer(sessionID)
	}

	log.Printf("[INFO] RoundManager cleanup complete")
}
