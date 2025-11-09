package services

import (
	"errors"
	"fmt"
	"log"
	"sync"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
	"github.com/kalee/two-rooms-and-a-boom/internal/websocket"
)

// ExchangeService handles hostage selection and exchange
type ExchangeService struct {
	store         *store.RoomStore
	hub           *websocket.Hub
	leaderService *LeaderService
	mu            sync.Mutex
}

// NewExchangeService creates a new ExchangeService instance
func NewExchangeService(store *store.RoomStore, hub *websocket.Hub, leaderService *LeaderService) *ExchangeService {
	return &ExchangeService{
		store:         store,
		hub:           hub,
		leaderService: leaderService,
	}
}

// SelectHostages handles leader's hostage selection
func (es *ExchangeService) SelectHostages(roomCode, leaderID string, hostageIDs []string) error {
	es.mu.Lock()
	defer es.mu.Unlock()

	room, err := es.store.Get(roomCode)
	if err != nil {
		return err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return errors.New("no active round")
	}

	roundState := room.GameSession.RoundState

	// Validate leader
	if !es.leaderService.IsLeader(roomCode, leaderID) {
		return errors.New("only leaders can select hostages")
	}

	// Validate hostage count
	if len(hostageIDs) != roundState.HostageCount {
		return fmt.Errorf("must select exactly %d hostages", roundState.HostageCount)
	}

	// Find leader to determine room
	var leaderRoom models.RoomColor
	for _, player := range room.Players {
		if player.ID == leaderID {
			leaderRoom = player.CurrentRoom
			break
		}
	}

	// Validate no self-selection
	for _, hid := range hostageIDs {
		if hid == leaderID {
			return errors.New("leader cannot select themselves as hostage")
		}
	}

	// Validate all hostages exist and are in leader's room
	hostageMap := make(map[string]bool)
	for _, hid := range hostageIDs {
		if hostageMap[hid] {
			return errors.New("duplicate player in selection")
		}
		hostageMap[hid] = true

		found := false
		for _, player := range room.Players {
			if player.ID == hid {
				if player.CurrentRoom != leaderRoom {
					return errors.New("can only select players in your room")
				}
				found = true
				break
			}
		}

		if !found {
			return errors.New("invalid player ID in selection")
		}
	}

	// Store selection
	if leaderRoom == models.RedRoom {
		if len(roundState.RedHostages) > 0 {
			return errors.New("red leader has already selected hostages")
		}
		roundState.RedHostages = hostageIDs
	} else {
		if len(roundState.BlueHostages) > 0 {
			return errors.New("blue leader has already selected hostages")
		}
		roundState.BlueHostages = hostageIDs
	}

	if err := es.store.Update(room); err != nil {
		return err
	}

	log.Printf("[INFO] Hostages selected: room=%s leader=%s count=%d",
		roomCode, leaderID, len(hostageIDs))

	// Broadcast LEADER_ANNOUNCED_HOSTAGES to room
	var hostages []*models.Player
	for _, hid := range hostageIDs {
		for _, player := range room.Players {
			if player.ID == hid {
				hostages = append(hostages, player)
				break
			}
		}
	}

	waitingForOther := false
	if leaderRoom == models.RedRoom {
		waitingForOther = len(roundState.BlueHostages) == 0
	} else {
		waitingForOther = len(roundState.RedHostages) == 0
	}

	payload := &websocket.LeaderAnnouncedHostagesPayload{
		RoomColor:             leaderRoom,
		Hostages:              hostages,
		WaitingForOtherLeader: waitingForOther,
	}

	msg, err := websocket.NewMessage(websocket.MessageLeaderAnnouncedHostages, payload)
	if err != nil {
		return err
	}

	data, _ := msg.Marshal()

	// Broadcast to players in the specific room color (PRIVATE event)
	var playerIDs []string
	for _, player := range room.Players {
		if player.CurrentRoom == leaderRoom {
			playerIDs = append(playerIDs, player.ID)
		}
	}
	es.hub.BroadcastToRoomColor(roomCode, playerIDs, data)

	// Check if both leaders have selected
	if len(roundState.RedHostages) > 0 && len(roundState.BlueHostages) > 0 {
		log.Printf("[INFO] Both leaders ready: room=%s executing exchange", roomCode)
		go es.ExecuteExchange(roomCode)
	}

	return nil
}

// ExecuteExchange performs atomic hostage exchange
func (es *ExchangeService) ExecuteExchange(roomCode string) error {
	es.mu.Lock()
	defer es.mu.Unlock()

	room, err := es.store.Get(roomCode)
	if err != nil {
		return err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return errors.New("no active round")
	}

	roundState := room.GameSession.RoundState

	// Validate both leaders have selected
	if len(roundState.RedHostages) == 0 || len(roundState.BlueHostages) == 0 {
		return errors.New("both leaders must select hostages")
	}

	// Validate equal counts
	if len(roundState.RedHostages) != len(roundState.BlueHostages) {
		return errors.New("unequal hostage counts")
	}

	// Broadcast EXCHANGE_READY
	var redHostagePlayers []*models.Player
	var blueHostagePlayers []*models.Player

	for _, hid := range roundState.RedHostages {
		for _, player := range room.Players {
			if player.ID == hid {
				redHostagePlayers = append(redHostagePlayers, player)
				break
			}
		}
	}

	for _, hid := range roundState.BlueHostages {
		for _, player := range room.Players {
			if player.ID == hid {
				blueHostagePlayers = append(blueHostagePlayers, player)
				break
			}
		}
	}

	readyPayload := &websocket.ExchangeReadyPayload{
		RedHostages:  redHostagePlayers,
		BlueHostages: blueHostagePlayers,
		Countdown:    3,
	}

	msg, _ := websocket.NewMessage(websocket.MessageExchangeReady, readyPayload)
	data, _ := msg.Marshal()
	es.hub.BroadcastToRoom(roomCode, data)

	// Execute atomic swap
	log.Printf("[INFO] Executing exchange: room=%s round=%d redHostages=%d blueHostages=%d",
		roomCode, roundState.RoundNumber, len(roundState.RedHostages), len(roundState.BlueHostages))

	// Update player room assignments
	for _, player := range room.Players {
		// Red hostages -> Blue room
		for _, hid := range roundState.RedHostages {
			if player.ID == hid {
				player.CurrentRoom = models.BlueRoom
				log.Printf("[DEBUG] Moved player %s from RED to BLUE", player.Nickname)
				break
			}
		}

		// Blue hostages -> Red room
		for _, hid := range roundState.BlueHostages {
			if player.ID == hid {
				player.CurrentRoom = models.RedRoom
				log.Printf("[DEBUG] Moved player %s from BLUE to RED", player.Nickname)
				break
			}
		}
	}

	// Update round state status
	roundState.Status = models.RoundStatusComplete

	if err := es.store.Update(room); err != nil {
		log.Printf("[ERROR] Exchange failed: %v", err)
		return err
	}

	// Build exchange records
	var exchanges []websocket.ExchangeRecord

	for _, hid := range roundState.RedHostages {
		for _, player := range room.Players {
			if player.ID == hid {
				exchanges = append(exchanges, websocket.ExchangeRecord{
					PlayerID: player.ID,
					Nickname: player.Nickname,
					FromRoom: models.RedRoom,
					ToRoom:   models.BlueRoom,
				})
				break
			}
		}
	}

	for _, hid := range roundState.BlueHostages {
		for _, player := range room.Players {
			if player.ID == hid {
				exchanges = append(exchanges, websocket.ExchangeRecord{
					PlayerID: player.ID,
					Nickname: player.Nickname,
					FromRoom: models.BlueRoom,
					ToRoom:   models.RedRoom,
				})
				break
			}
		}
	}

	// Broadcast EXCHANGE_COMPLETE
	nextRound := 0
	if roundState.RoundNumber < 3 {
		nextRound = roundState.RoundNumber + 1
	}

	completePayload := &websocket.ExchangeCompletePayload{
		RoundNumber: roundState.RoundNumber,
		Exchanges:   exchanges,
		NextRound:   nextRound,
	}

	completeMsg, _ := websocket.NewMessage(websocket.MessageExchangeComplete, completePayload)
	completeData, _ := completeMsg.Marshal()
	es.hub.BroadcastToRoom(roomCode, completeData)

	log.Printf("[INFO] Exchange complete: room=%s round=%d exchanged=%d players",
		roomCode, roundState.RoundNumber, len(exchanges))

	return nil
}

// ValidateSelections validates both leaders' selections before exchange
func (es *ExchangeService) ValidateSelections(roomCode string) error {
	room, err := es.store.Get(roomCode)
	if err != nil {
		return err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return errors.New("no active round")
	}

	roundState := room.GameSession.RoundState

	// Check both leaders have selected
	if len(roundState.RedHostages) == 0 {
		return errors.New("red leader has not selected hostages")
	}

	if len(roundState.BlueHostages) == 0 {
		return errors.New("blue leader has not selected hostages")
	}

	// Check equal counts
	if len(roundState.RedHostages) != len(roundState.BlueHostages) {
		return fmt.Errorf("unequal hostage counts: red=%d blue=%d",
			len(roundState.RedHostages), len(roundState.BlueHostages))
	}

	// Check correct count
	if len(roundState.RedHostages) != roundState.HostageCount {
		return fmt.Errorf("incorrect hostage count: expected=%d actual=%d",
			roundState.HostageCount, len(roundState.RedHostages))
	}

	return nil
}

// GetSelectionStatus returns selection status for both rooms
func (es *ExchangeService) GetSelectionStatus(roomCode string) (redSelected, blueSelected bool, err error) {
	room, err := es.store.Get(roomCode)
	if err != nil {
		return false, false, err
	}

	if room.GameSession == nil || room.GameSession.RoundState == nil {
		return false, false, errors.New("no active round")
	}

	roundState := room.GameSession.RoundState

	redSelected = len(roundState.RedHostages) > 0
	blueSelected = len(roundState.BlueHostages) > 0

	return redSelected, blueSelected, nil
}
