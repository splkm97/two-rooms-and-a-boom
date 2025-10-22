package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
)

// PlayerService handles player-related business logic
type PlayerService struct {
	roomStore *store.RoomStore
}

// NewPlayerService creates a new PlayerService instance
func NewPlayerService(roomStore *store.RoomStore) *PlayerService {
	return &PlayerService{
		roomStore: roomStore,
	}
}

// T036: Implement PlayerService.JoinRoom
func (s *PlayerService) JoinRoom(roomCode string) (*models.Player, error) {
	// Get room
	room, err := s.roomStore.Get(roomCode)
	if err != nil {
		return nil, err
	}

	// Check if room is full
	if len(room.Players) >= room.MaxPlayers {
		return nil, models.ErrRoomFull
	}

	// Check if game already started
	if room.Status == models.RoomStatusInProgress {
		return nil, models.ErrGameAlreadyStarted
	}

	// Generate player ID
	playerID := uuid.New().String()

	// Generate anonymous nickname
	nickname := s.generateAnonymousNickname(room)

	// Determine if player is owner (first player)
	isOwner := len(room.Players) == 0

	// Create player
	player := &models.Player{
		ID:          playerID,
		Nickname:    nickname,
		IsAnonymous: true,
		RoomCode:    roomCode,
		IsOwner:     isOwner,
		ConnectedAt: time.Now(),
	}

	// Add player to room
	room.Players = append(room.Players, player)
	room.UpdatedAt = time.Now()

	// Update room in store
	if err := s.roomStore.Update(room); err != nil {
		return nil, err
	}

	return player, nil
}

// generateAnonymousNickname generates a sequential anonymous nickname
func (s *PlayerService) generateAnonymousNickname(room *models.Room) string {
	// Generate nickname like "플레이어1", "플레이어2", etc.
	playerNumber := len(room.Players) + 1
	return fmt.Sprintf("플레이어%d", playerNumber)
}

// T037: Implement PlayerService.UpdateNickname
func (s *PlayerService) UpdateNickname(roomCode, playerID, newNickname string) (*models.Player, error) {
	// Validate nickname length (2-20 characters)
	if len([]rune(newNickname)) < 2 || len([]rune(newNickname)) > 20 {
		return nil, models.ErrInvalidNickname
	}

	// Get room
	room, err := s.roomStore.Get(roomCode)
	if err != nil {
		return nil, err
	}

	// Find player
	var targetPlayer *models.Player
	for _, player := range room.Players {
		if player.ID == playerID {
			targetPlayer = player
			break
		}
	}

	if targetPlayer == nil {
		return nil, models.ErrPlayerNotFound
	}

	// Check for duplicate nicknames and add suffix if needed
	finalNickname := s.handleDuplicateNickname(room, playerID, newNickname)

	// Update player
	targetPlayer.Nickname = finalNickname
	targetPlayer.IsAnonymous = false

	// Update room in store
	room.UpdatedAt = time.Now()
	if err := s.roomStore.Update(room); err != nil {
		return nil, err
	}

	return targetPlayer, nil
}

// handleDuplicateNickname checks for duplicate nicknames and adds suffix if needed
func (s *PlayerService) handleDuplicateNickname(room *models.Room, playerID, nickname string) string {
	// Check if nickname is already taken by another player
	isDuplicate := false
	for _, player := range room.Players {
		if player.ID != playerID && player.Nickname == nickname {
			isDuplicate = true
			break
		}
	}

	if !isDuplicate {
		return nickname
	}

	// Find available suffix number
	suffix := 2
	for {
		candidateNickname := fmt.Sprintf("%s (%d)", nickname, suffix)

		// Check if this candidate is available
		isAvailable := true
		for _, player := range room.Players {
			if player.ID != playerID && player.Nickname == candidateNickname {
				isAvailable = false
				break
			}
		}

		if isAvailable {
			return candidateNickname
		}

		suffix++
		// Prevent infinite loop
		if suffix > 100 {
			return fmt.Sprintf("%s (%d)", nickname, suffix)
		}
	}
}
