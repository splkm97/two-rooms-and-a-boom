package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
	ws "github.com/kalee/two-rooms-and-a-boom/internal/websocket"
)

// PlayerService handles player-related business logic
type PlayerService struct {
	roomStore *store.RoomStore
	hub       *ws.Hub
}

// NewPlayerService creates a new PlayerService instance
func NewPlayerService(roomStore *store.RoomStore, hub *ws.Hub) *PlayerService {
	return &PlayerService{
		roomStore: roomStore,
		hub:       hub,
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

	// Broadcast PLAYER_JOINED event to all players in the room
	if s.hub != nil {
		payload := &ws.PlayerJoinedPayload{
			Player: player,
		}
		if err := s.hub.BroadcastPlayerJoined(roomCode, payload); err != nil {
			// Log error but don't fail the join operation
			fmt.Printf("[WARN] Failed to broadcast PLAYER_JOINED: %v\n", err)
		}
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

	// Broadcast NICKNAME_CHANGED event to all players in the room
	if s.hub != nil {
		payload := &ws.NicknameChangedPayload{
			PlayerID:    playerID,
			NewNickname: finalNickname,
		}
		if err := s.hub.BroadcastNicknameChanged(roomCode, payload); err != nil {
			// Log error but don't fail the update operation
			fmt.Printf("[WARN] Failed to broadcast NICKNAME_CHANGED: %v\n", err)
		}
	}

	return targetPlayer, nil
}

// LeaveRoom removes a player from the room and broadcasts PLAYER_LEFT event
// If the owner leaves, the entire room is deleted and ROOM_CLOSED event is broadcast
func (s *PlayerService) LeaveRoom(roomCode, playerID string) error {
	// Get room
	room, err := s.roomStore.Get(roomCode)
	if err != nil {
		return err
	}

	// Find and remove player
	playerIndex := -1
	var wasOwner bool
	for i, player := range room.Players {
		if player.ID == playerID {
			playerIndex = i
			wasOwner = player.IsOwner
			break
		}
	}

	if playerIndex == -1 {
		return models.ErrPlayerNotFound
	}

	// If the leaving player is the owner, delete the room only if game is not in progress
	if wasOwner {
		// Don't delete room during active games - let players continue
		if room.Status != models.RoomStatusInProgress {
			if err := s.roomStore.Delete(roomCode); err != nil {
				fmt.Printf("[WARN] Failed to delete room %s after owner left: %v\n", roomCode, err)
				return err
			}
			fmt.Printf("[INFO] Deleted room %s because owner left\n", roomCode)

			// Broadcast ROOM_CLOSED event to all players in the room
			if s.hub != nil {
				if err := s.hub.BroadcastRoomClosed(roomCode); err != nil {
					fmt.Printf("[WARN] Failed to broadcast ROOM_CLOSED: %v\n", err)
				}
			}
			return nil
		}

		// If game is in progress, keep room and player intact
		// Owner can rejoin by refreshing - their player record stays in the room
		fmt.Printf("[INFO] Owner left room %s during active game - keeping room and player alive for rejoin\n", roomCode)

		// Broadcast PLAYER_LEFT event so other players know they disconnected
		if s.hub != nil {
			payload := &ws.PlayerLeftPayload{
				PlayerID: playerID,
			}
			if err := s.hub.BroadcastPlayerLeft(roomCode, payload); err != nil {
				fmt.Printf("[WARN] Failed to broadcast PLAYER_LEFT: %v\n", err)
			}
		}

		return nil
	}

	// If game is in progress, keep player in room for potential rejoin
	if room.Status == models.RoomStatusInProgress {
		fmt.Printf("[INFO] Player %s left room %s during active game - keeping player alive for rejoin\n", playerID, roomCode)

		// Broadcast PLAYER_LEFT event so other players know they disconnected
		if s.hub != nil {
			payload := &ws.PlayerLeftPayload{
				PlayerID: playerID,
			}
			if err := s.hub.BroadcastPlayerLeft(roomCode, payload); err != nil {
				fmt.Printf("[WARN] Failed to broadcast PLAYER_LEFT: %v\n", err)
			}
		}

		return nil
	}

	// Remove player from room (only if game is not in progress)
	room.Players = append(room.Players[:playerIndex], room.Players[playerIndex+1:]...)
	room.UpdatedAt = time.Now()

	// If room is empty after player leaves, delete the room
	if len(room.Players) == 0 {
		if err := s.roomStore.Delete(roomCode); err != nil {
			fmt.Printf("[WARN] Failed to delete empty room %s: %v\n", roomCode, err)
			// Continue anyway - room cleanup is not critical
		}
		fmt.Printf("[INFO] Deleted empty room: %s\n", roomCode)
		return nil
	}

	// Update room in store
	if err := s.roomStore.Update(room); err != nil {
		return err
	}

	// Broadcast PLAYER_LEFT event to remaining players in the room
	if s.hub != nil {
		payload := &ws.PlayerLeftPayload{
			PlayerID: playerID,
		}
		if err := s.hub.BroadcastPlayerLeft(roomCode, payload); err != nil {
			fmt.Printf("[WARN] Failed to broadcast PLAYER_LEFT: %v\n", err)
		}
	}

	return nil
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
