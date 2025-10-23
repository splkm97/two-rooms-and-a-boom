package services

import (
	"errors"
	"log"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
)

// GameService handles game logic operations
type GameService struct {
	roomStore *store.RoomStore
	hub       Hub // Interface to allow mocking
}

// Hub interface for WebSocket broadcasts
// Note: Using interface{} to avoid circular dependencies
type Hub interface {
	BroadcastGameStarted(roomCode string, payload interface{}) error
	SendRoleAssigned(roomCode, playerID string, payload interface{}) error
	BroadcastGameReset(roomCode string, payload interface{}) error
}

// NewGameService creates a new GameService instance
func NewGameService(roomStore *store.RoomStore) *GameService {
	return &GameService{
		roomStore: roomStore,
		hub:       nil, // Will be set via SetHub
	}
}

// SetHub sets the WebSocket hub for broadcasting
func (s *GameService) SetHub(hub Hub) {
	s.hub = hub
}

// T069: Implement team assignment algorithm (AssignTeams - FR-008)
// Assigns players to RED and BLUE teams with equal split
// If odd number of players, RED team gets the extra player
func AssignTeams(players []*models.Player) {
	// Shuffle players for randomness
	rand.Seed(time.Now().UnixNano())
	shuffled := make([]*models.Player, len(players))
	copy(shuffled, players)
	rand.Shuffle(len(shuffled), func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	// Calculate team sizes (FR-008: if odd, red team gets +1)
	totalPlayers := len(shuffled)
	blueTeamSize := totalPlayers / 2
	redTeamSize := totalPlayers - blueTeamSize

	// Assign teams
	for i, player := range shuffled {
		if i < redTeamSize {
			player.Team = models.TeamRed
		} else {
			player.Team = models.TeamBlue
		}
	}
}

// T070: Implement role distribution algorithm
// FR-009: President=BLUE, Bomber=RED
// FR-010: Spies per team (1 if 6-9 players, 2 if 10+ players)
// FR-011: Remaining players are operatives
func AssignRoles(players []*models.Player) {
	// Separate players by team
	var redTeam []*models.Player
	var blueTeam []*models.Player

	for _, player := range players {
		if player.Team == models.TeamRed {
			redTeam = append(redTeam, player)
		} else {
			blueTeam = append(blueTeam, player)
		}
	}

	// Calculate spy count per team (FR-010)
	totalPlayers := len(players)
	spiesPerTeam := 1
	if totalPlayers >= 10 {
		spiesPerTeam = 2
	}

	// Assign RED team roles
	// 1. First player: Bomber (FR-009)
	if len(redTeam) > 0 {
		bomber := models.RoleBomber
		redTeam[0].Role = &bomber
	}

	// 2. Next N players: Red Spies (FR-010)
	spyCount := 0
	for i := 1; i < len(redTeam) && spyCount < spiesPerTeam; i++ {
		spy := models.RoleRedSpy
		redTeam[i].Role = &spy
		spyCount++
	}

	// 3. Remaining: Red Operatives (FR-011)
	for i := 1 + spyCount; i < len(redTeam); i++ {
		operative := models.RoleRedOperative
		redTeam[i].Role = &operative
	}

	// Assign BLUE team roles
	// 1. First player: President (FR-009)
	if len(blueTeam) > 0 {
		president := models.RolePresident
		blueTeam[0].Role = &president
	}

	// 2. Next N players: Blue Spies (FR-010)
	spyCount = 0
	for i := 1; i < len(blueTeam) && spyCount < spiesPerTeam; i++ {
		spy := models.RoleBlueSpy
		blueTeam[i].Role = &spy
		spyCount++
	}

	// 3. Remaining: Blue Operatives (FR-011)
	for i := 1 + spyCount; i < len(blueTeam); i++ {
		operative := models.RoleBlueOperative
		blueTeam[i].Role = &operative
	}
}

// T071: Implement room assignment algorithm (AssignRooms - FR-013)
// Assigns players to RED_ROOM and BLUE_ROOM with equal split
// If odd number of players, one room gets +1 player
func AssignRooms(players []*models.Player) {
	// Shuffle players for randomness
	rand.Seed(time.Now().UnixNano())
	shuffled := make([]*models.Player, len(players))
	copy(shuffled, players)
	rand.Shuffle(len(shuffled), func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	// Calculate room sizes (FR-013: equal split, ±1 if odd)
	totalPlayers := len(shuffled)
	blueRoomSize := totalPlayers / 2
	redRoomSize := totalPlayers - blueRoomSize

	// Assign rooms
	for i, player := range shuffled {
		if i < redRoomSize {
			player.CurrentRoom = models.RedRoom
		} else {
			player.CurrentRoom = models.BlueRoom
		}
	}
}

// T072: Implement GameService.StartGame
// Validates room has >=6 players, creates session, assigns teams, roles, and rooms
func (s *GameService) StartGame(roomCode string) (*models.GameSession, error) {
	// Get room
	room, err := s.roomStore.Get(roomCode)
	if err != nil {
		return nil, err
	}

	// Validate room status
	if room.Status == models.RoomStatusInProgress {
		return nil, errors.New("game already started")
	}

	// Validate player count (FR-007: minimum 6 players)
	if len(room.Players) < 6 {
		return nil, errors.New("insufficient players: minimum 6 required")
	}

	// Create game session
	sessionID := uuid.New().String()
	session := &models.GameSession{
		ID:        sessionID,
		RoomCode:  roomCode,
		StartedAt: time.Now(),
	}

	// Assign teams (FR-008)
	AssignTeams(room.Players)

	// Assign roles (FR-009, FR-010, FR-011)
	AssignRoles(room.Players)

	// Assign rooms (FR-013)
	AssignRooms(room.Players)

	// Update room status and attach session
	room.Status = models.RoomStatusInProgress
	room.GameSession = session
	room.UpdatedAt = time.Now()

	// Save updated room
	if err := s.roomStore.Update(room); err != nil {
		log.Printf("[ERROR] Failed to start game: %v", err)
		return nil, err
	}

	// T103: Log critical operation
	log.Printf("[INFO] Game started: room=%s sessionID=%s players=%d", roomCode, sessionID, len(room.Players))

	// Broadcast GAME_STARTED to all players (T074)
	if s.hub != nil {
		gameStartedPayload := map[string]interface{}{
			"gameSession": session,
		}
		s.hub.BroadcastGameStarted(roomCode, gameStartedPayload)

		// Send ROLE_ASSIGNED to each player individually (T075)
		for _, player := range room.Players {
			roleAssignedPayload := map[string]interface{}{
				"role":        player.Role,
				"team":        player.Team,
				"currentRoom": player.CurrentRoom,
			}
			s.hub.SendRoleAssigned(roomCode, player.ID, roleAssignedPayload)
		}
	}

	return session, nil
}

// GetRoom retrieves a room by code
func (s *GameService) GetRoom(roomCode string) (*models.Room, error) {
	return s.roomStore.Get(roomCode)
}

// T089: Implement GameService.ResetGame
// Clears game session, resets player roles/teams/rooms, sets room status to WAITING
func (s *GameService) ResetGame(roomCode string) error {
	// Get room
	room, err := s.roomStore.Get(roomCode)
	if err != nil {
		return err
	}

	// Validate room status - can only reset a game in progress
	if room.Status != models.RoomStatusInProgress {
		return errors.New("game not started")
	}

	// Clear game session
	room.GameSession = nil

	// Reset all players (clear roles, teams, rooms)
	for _, player := range room.Players {
		player.Role = nil
		player.Team = ""
		player.CurrentRoom = ""
	}

	// Set room status back to WAITING
	room.Status = models.RoomStatusWaiting
	room.UpdatedAt = time.Now()

	// Save updated room
	if err := s.roomStore.Update(room); err != nil {
		return err
	}

	// Broadcast GAME_RESET to all players (T091)
	if s.hub != nil {
		gameResetPayload := map[string]interface{}{
			"room": room,
		}
		s.hub.BroadcastGameReset(roomCode, gameResetPayload)
	}

	return nil
}
