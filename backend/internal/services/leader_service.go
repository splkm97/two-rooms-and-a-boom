package services

import (
	"errors"
	"log"
	"math/rand"
	"time"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
	"github.com/kalee/two-rooms-and-a-boom/internal/websocket"
)

// LeaderService handles leader assignment and management
type LeaderService struct {
	store *store.RoomStore
	hub   *websocket.Hub
}

// NewLeaderService creates a new LeaderService instance
func NewLeaderService(store *store.RoomStore, hub *websocket.Hub) *LeaderService {
	return &LeaderService{
		store: store,
		hub:   hub,
	}
}

// PreserveLeaders keeps existing leaders and broadcasts ROUND_STARTED
func (ls *LeaderService) PreserveLeaders(roomCode string) error {
	room, err := ls.store.Get(roomCode)
	if err != nil {
		return err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return errors.New("no active round")
	}

	roundState := room.GameSession.RoundState

	// Find the existing leaders by ID
	var redLeader, blueLeader *models.Player
	for _, player := range room.Players {
		if player.ID == roundState.RedLeaderID {
			redLeader = player
		}
		if player.ID == roundState.BlueLeaderID {
			blueLeader = player
		}
	}

	if redLeader == nil || blueLeader == nil {
		return errors.New("existing leaders not found")
	}

	// Update status to ACTIVE
	roundState.Status = models.RoundStatusActive

	if err := ls.store.Update(room); err != nil {
		return err
	}

	log.Printf("[INFO] Leaders preserved: room=%s redLeader=%s (in %s) blueLeader=%s (in %s)",
		roomCode, redLeader.Nickname, redLeader.CurrentRoom, blueLeader.Nickname, blueLeader.CurrentRoom)

	// Broadcast ROUND_STARTED with leader info
	payload := &websocket.RoundStartedPayload{
		RoundNumber:   roundState.RoundNumber,
		Duration:      roundState.Duration,
		TimeRemaining: roundState.TimeRemaining,
		RedLeader: &websocket.LeaderInfo{
			ID:       redLeader.ID,
			Nickname: redLeader.Nickname,
		},
		BlueLeader: &websocket.LeaderInfo{
			ID:       blueLeader.ID,
			Nickname: blueLeader.Nickname,
		},
		HostageCount: roundState.HostageCount,
	}

	msg, err := websocket.NewMessage(websocket.MessageRoundStarted, payload)
	if err != nil {
		return err
	}

	data, err := msg.Marshal()
	if err != nil {
		return err
	}

	ls.hub.BroadcastToRoom(roomCode, data)
	return nil
}

// AssignLeaders randomly assigns one leader per room
func (ls *LeaderService) AssignLeaders(roomCode string) error {
	room, err := ls.store.Get(roomCode)
	if err != nil {
		return err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return errors.New("no active round")
	}

	roundState := room.GameSession.RoundState

	// Separate players by current room
	var redRoomPlayers []*models.Player
	var blueRoomPlayers []*models.Player

	for _, player := range room.Players {
		if player.CurrentRoom == models.RedRoom {
			redRoomPlayers = append(redRoomPlayers, player)
		} else if player.CurrentRoom == models.BlueRoom {
			blueRoomPlayers = append(blueRoomPlayers, player)
		}
	}

	// Validate we have players in both rooms
	if len(redRoomPlayers) == 0 || len(blueRoomPlayers) == 0 {
		return errors.New("both rooms must have at least one player")
	}

	// Randomly select leaders
	rand.Seed(time.Now().UnixNano())
	redLeaderIdx := rand.Intn(len(redRoomPlayers))
	blueLeaderIdx := rand.Intn(len(blueRoomPlayers))

	redLeader := redRoomPlayers[redLeaderIdx]
	blueLeader := blueRoomPlayers[blueLeaderIdx]

	// Ensure leaders are different players
	if redLeader.ID == blueLeader.ID {
		return errors.New("leaders cannot be the same player")
	}

	// Assign leaders to round state
	roundState.RedLeaderID = redLeader.ID
	roundState.BlueLeaderID = blueLeader.ID

	// Update status to ACTIVE
	roundState.Status = models.RoundStatusActive

	if err := ls.store.Update(room); err != nil {
		return err
	}

	log.Printf("[INFO] Leaders assigned: room=%s redLeader=%s blueLeader=%s",
		roomCode, redLeader.Nickname, blueLeader.Nickname)

	// Broadcast ROUND_STARTED with leader info
	payload := &websocket.RoundStartedPayload{
		RoundNumber:   roundState.RoundNumber,
		Duration:      roundState.Duration,
		TimeRemaining: roundState.TimeRemaining,
		RedLeader: &websocket.LeaderInfo{
			ID:       redLeader.ID,
			Nickname: redLeader.Nickname,
		},
		BlueLeader: &websocket.LeaderInfo{
			ID:       blueLeader.ID,
			Nickname: blueLeader.Nickname,
		},
		HostageCount: roundState.HostageCount,
	}

	msg, err := websocket.NewMessage(websocket.MessageRoundStarted, payload)
	if err != nil {
		return err
	}

	data, _ := msg.Marshal()
	ls.hub.BroadcastToRoom(roomCode, data)

	return nil
}

// GetLeader retrieves the leader for a specific room
func (ls *LeaderService) GetLeader(roomCode string, roomColor models.RoomColor) (*models.Player, error) {
	room, err := ls.store.Get(roomCode)
	if err != nil {
		return nil, err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return nil, errors.New("no active round")
	}

	roundState := room.GameSession.RoundState
	var leaderID string

	if roomColor == models.RedRoom {
		leaderID = roundState.RedLeaderID
	} else if roomColor == models.BlueRoom {
		leaderID = roundState.BlueLeaderID
	} else {
		return nil, errors.New("invalid room color")
	}

	// Find leader player
	for _, player := range room.Players {
		if player.ID == leaderID {
			return player, nil
		}
	}

	return nil, errors.New("leader not found")
}

// IsLeader checks if a player is a leader
func (ls *LeaderService) IsLeader(roomCode, playerID string) bool {
	room, err := ls.store.Get(roomCode)
	if err != nil {
		return false
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return false
	}

	roundState := room.GameSession.RoundState
	return roundState.RedLeaderID == playerID || roundState.BlueLeaderID == playerID
}

// TransferLeadership voluntarily transfers leadership to another player
func (ls *LeaderService) TransferLeadership(roomCode, currentLeaderID, newLeaderID string) error {
	room, err := ls.store.Get(roomCode)
	if err != nil {
		return err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return errors.New("no active round")
	}

	roundState := room.GameSession.RoundState

	// Validate current leader
	if !ls.IsLeader(roomCode, currentLeaderID) {
		return errors.New("only current leader can transfer leadership")
	}

	// Validate not in SELECTING phase
	if roundState.Status == models.RoundStatusSelecting {
		return errors.New("cannot transfer leadership during hostage selection")
	}

	// Find current and new leader players
	var currentLeader, newLeader *models.Player
	var roomColor models.RoomColor

	for _, player := range room.Players {
		if player.ID == currentLeaderID {
			currentLeader = player
		}
		if player.ID == newLeaderID {
			newLeader = player
		}
	}

	if currentLeader == nil {
		return errors.New("current leader not found")
	}

	if newLeader == nil {
		return errors.New("new leader not found")
	}

	// Verify new leader is in same room
	if newLeader.CurrentRoom != currentLeader.CurrentRoom {
		return errors.New("new leader must be in same room")
	}

	roomColor = currentLeader.CurrentRoom

	// Verify new leader is not already a leader
	if newLeaderID == roundState.RedLeaderID || newLeaderID == roundState.BlueLeaderID {
		return errors.New("player is already a leader")
	}

	// Update leader assignment
	if roomColor == models.RedRoom {
		roundState.RedLeaderID = newLeaderID
	} else {
		roundState.BlueLeaderID = newLeaderID
	}

	if err := ls.store.Update(room); err != nil {
		return err
	}

	log.Printf("[INFO] Leadership transferred: room=%s from=%s to=%s",
		roomCode, currentLeader.Nickname, newLeader.Nickname)

	// Broadcast LEADERSHIP_CHANGED
	return ls.broadcastLeadershipChanged(roomCode, roomColor, currentLeader, newLeader, models.ReasonVoluntaryTransfer)
}

// HandleLeaderDisconnect handles leader disconnection by reassigning
func (ls *LeaderService) HandleLeaderDisconnect(roomCode, leaderID string) error {
	room, err := ls.store.Get(roomCode)
	if err != nil {
		return err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return errors.New("no active round")
	}

	roundState := room.GameSession.RoundState

	// Determine which room's leader disconnected
	var roomColor models.RoomColor
	if roundState.RedLeaderID == leaderID {
		roomColor = models.RedRoom
	} else if roundState.BlueLeaderID == leaderID {
		roomColor = models.BlueRoom
	} else {
		return nil // Not a leader, no action needed
	}

	// Find disconnected leader
	var oldLeader *models.Player
	for _, player := range room.Players {
		if player.ID == leaderID {
			oldLeader = player
			break
		}
	}

	// Get eligible players in the same room (excluding disconnected leader)
	var eligiblePlayers []*models.Player
	for _, player := range room.Players {
		if player.CurrentRoom == roomColor && player.ID != leaderID {
			eligiblePlayers = append(eligiblePlayers, player)
		}
	}

	if len(eligiblePlayers) == 0 {
		return errors.New("no eligible players to become leader")
	}

	// Randomly select new leader
	rand.Seed(time.Now().UnixNano())
	newLeaderIdx := rand.Intn(len(eligiblePlayers))
	newLeader := eligiblePlayers[newLeaderIdx]

	// Update leader assignment
	if roomColor == models.RedRoom {
		roundState.RedLeaderID = newLeader.ID
	} else {
		roundState.BlueLeaderID = newLeader.ID
	}

	if err := ls.store.Update(room); err != nil {
		return err
	}

	log.Printf("[INFO] Leader reassigned after disconnect: room=%s from=%s to=%s",
		roomCode, leaderID, newLeader.Nickname)

	// Broadcast LEADERSHIP_CHANGED
	return ls.broadcastLeadershipChanged(roomCode, roomColor, oldLeader, newLeader, models.ReasonDisconnection)
}

// CanTransferLeadership checks if leadership transfer is allowed
func (ls *LeaderService) CanTransferLeadership(roomCode string) bool {
	room, err := ls.store.Get(roomCode)
	if err != nil {
		return false
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return false
	}

	// Cannot transfer during SELECTING phase
	return room.GameSession.RoundState.Status != models.RoundStatusSelecting
}

// broadcastLeadershipChanged broadcasts leadership change event
func (ls *LeaderService) broadcastLeadershipChanged(
	roomCode string,
	roomColor models.RoomColor,
	oldLeader *models.Player,
	newLeader *models.Player,
	reason models.LeadershipChangeReason,
) error {
	room, err := ls.store.Get(roomCode)
	if err != nil {
		return err
	}

	var oldLeaderInfo, newLeaderInfo *websocket.LeaderInfo

	if oldLeader != nil {
		oldLeaderInfo = &websocket.LeaderInfo{
			ID:       oldLeader.ID,
			Nickname: oldLeader.Nickname,
		}
	}

	if newLeader != nil {
		newLeaderInfo = &websocket.LeaderInfo{
			ID:       newLeader.ID,
			Nickname: newLeader.Nickname,
		}
	}

	payload := &websocket.LeadershipChangedPayload{
		RoomColor: roomColor,
		OldLeader: oldLeaderInfo,
		NewLeader: newLeaderInfo,
		Reason:    reason,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	msg, err := websocket.NewMessage(websocket.MessageLeadershipChanged, payload)
	if err != nil {
		return err
	}

	data, _ := msg.Marshal()

	// Get player IDs in the specific room color (PRIVATE event)
	var playerIDs []string
	for _, player := range room.Players {
		if player.CurrentRoom == roomColor {
			playerIDs = append(playerIDs, player.ID)
		}
	}

	ls.hub.BroadcastToRoomColor(roomCode, playerIDs, data)

	return nil
}

// AssignNewLeader randomly assigns a new leader after vote removal
func (ls *LeaderService) AssignNewLeader(roomCode string, roomColor models.RoomColor, excludePlayerID string) (*models.Player, error) {
	room, err := ls.store.Get(roomCode)
	if err != nil {
		return nil, err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return nil, errors.New("no active round")
	}

	roundState := room.GameSession.RoundState

	// Get eligible players in the room (excluding removed leader)
	var eligiblePlayers []*models.Player
	for _, player := range room.Players {
		if player.CurrentRoom == roomColor && player.ID != excludePlayerID {
			eligiblePlayers = append(eligiblePlayers, player)
		}
	}

	if len(eligiblePlayers) == 0 {
		return nil, errors.New("no eligible players to become leader")
	}

	// Randomly select new leader
	rand.Seed(time.Now().UnixNano())
	newLeaderIdx := rand.Intn(len(eligiblePlayers))
	newLeader := eligiblePlayers[newLeaderIdx]

	// Update leader assignment
	if roomColor == models.RedRoom {
		roundState.RedLeaderID = newLeader.ID
	} else {
		roundState.BlueLeaderID = newLeader.ID
	}

	if err := ls.store.Update(room); err != nil {
		return nil, err
	}

	log.Printf("[INFO] New leader assigned after vote: room=%s leader=%s",
		roomCode, newLeader.Nickname)

	return newLeader, nil
}

// SetLeader assigns a specific player as leader (used for election results)
func (ls *LeaderService) SetLeader(roomCode string, roomColor models.RoomColor, playerID string) (*models.Player, error) {
	room, err := ls.store.Get(roomCode)
	if err != nil {
		return nil, err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return nil, errors.New("no active round")
	}

	// Find the player
	var newLeader *models.Player
	for _, player := range room.Players {
		if player.ID == playerID {
			newLeader = player
			break
		}
	}

	if newLeader == nil {
		return nil, errors.New("player not found")
	}

	// Verify player is in the correct room
	if newLeader.CurrentRoom != roomColor {
		return nil, errors.New("player not in specified room")
	}

	roundState := room.GameSession.RoundState

	// Update leader assignment
	if roomColor == models.RedRoom {
		roundState.RedLeaderID = newLeader.ID
	} else {
		roundState.BlueLeaderID = newLeader.ID
	}

	if err := ls.store.Update(room); err != nil {
		return nil, err
	}

	log.Printf("[INFO] Leader elected: room=%s leader=%s",
		roomCode, newLeader.Nickname)

	return newLeader, nil
}
