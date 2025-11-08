package services

import (
	"errors"
	"fmt"
	"log"
	"math/rand"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/kalee/two-rooms-and-a-boom/internal/config"
	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
)

// GameService handles game logic operations
type GameService struct {
	roomStore    *store.RoomStore
	hub          Hub // Interface to allow mocking
	roleLoader   *config.RoleConfigLoader
	roundManager *RoundManager
	leaderService *LeaderService
}

// Hub interface for WebSocket broadcasts
// Note: Using interface{} to avoid circular dependencies
type Hub interface {
	BroadcastGameStarted(roomCode string, payload interface{}) error
	SendRoleAssigned(roomCode, playerID string, payload interface{}) error
	BroadcastGameReset(roomCode string, payload interface{}) error
}

// NewGameService creates a new GameService instance
func NewGameService(roomStore *store.RoomStore, roleLoader *config.RoleConfigLoader) *GameService {
	return &GameService{
		roomStore:     roomStore,
		hub:           nil, // Will be set via SetHub
		roleLoader:    roleLoader,
		roundManager:  nil, // Will be set via SetRoundManager
		leaderService: nil, // Will be set via SetLeaderService
	}
}

// SetRoundManager sets the RoundManager for starting rounds
func (s *GameService) SetRoundManager(rm *RoundManager) {
	s.roundManager = rm
}

// SetLeaderService sets the LeaderService for assigning leaders
func (s *GameService) SetLeaderService(ls *LeaderService) {
	s.leaderService = ls
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

	// Shuffle each team to randomize role assignment
	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(redTeam), func(i, j int) {
		redTeam[i], redTeam[j] = redTeam[j], redTeam[i]
	})
	rand.Shuffle(len(blueTeam), func(i, j int) {
		blueTeam[i], blueTeam[j] = blueTeam[j], blueTeam[i]
	})

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

// AssignRolesWithConfig assigns roles using a role configuration
func (s *GameService) AssignRolesWithConfig(players []*models.Player, configID string, selectedRoles map[string]int) error {
	// Get configuration
	roleConfig, err := s.roleLoader.Get(configID)
	if err != nil {
		return fmt.Errorf("failed to get role config: %w", err)
	}

	totalPlayers := len(players)

	// Filter roleConfig.Roles to only include selected roles
	var selectedRoleDefs []config.RoleDefinition
	totalSelectedCount := 0

	if selectedRoles != nil && len(selectedRoles) > 0 {
		// Use only selected roles with their specified counts
		log.Printf("[DEBUG] Using selected roles: %+v", selectedRoles)
		for _, roleDef := range roleConfig.Roles {
			if count, ok := selectedRoles[roleDef.ID]; ok && count > 0 {
				// Override the role's count with the selected count
				roleDefCopy := roleDef
				roleDefCopy.Count = config.RoleCount{Fixed: &count}
				selectedRoleDefs = append(selectedRoleDefs, roleDefCopy)
				totalSelectedCount += count
				log.Printf("[DEBUG] Selected role: %s (count=%d, team=%s)", roleDef.ID, count, roleDef.Team)
			}
		}
		log.Printf("[DEBUG] Total selected roles: %d, Total players: %d", totalSelectedCount, totalPlayers)
	} else {
		// No selection provided, use all roles from config
		log.Printf("[DEBUG] No selected roles provided, using all roles from config")
		selectedRoleDefs = roleConfig.Roles
		for _, roleDef := range selectedRoleDefs {
			if roleDef.MinPlayers <= totalPlayers {
				totalSelectedCount += roleDef.Count.GetCount(totalPlayers)
			}
		}
	}

	// Validate that we have enough roles for all players
	if totalSelectedCount > totalPlayers {
		return fmt.Errorf("too many roles selected (%d) for player count (%d)", totalSelectedCount, totalPlayers)
	}

	// Calculate how many roles we need for each team
	redRoleCount := 0
	blueRoleCount := 0
	greyRoleCount := 0
	for _, roleDef := range selectedRoleDefs {
		// When roles are explicitly selected, ignore minPlayers restriction
		// since the user is consciously choosing them
		count := roleDef.Count.GetCount(totalPlayers)
		switch roleDef.Team {
		case config.TeamRed:
			redRoleCount += count
		case config.TeamBlue:
			blueRoleCount += count
		case config.TeamGrey:
			greyRoleCount += count
		}
	}

	log.Printf("[DEBUG] Role counts by team: RED=%d, BLUE=%d, GREY=%d", redRoleCount, blueRoleCount, greyRoleCount)

	// Separate players by team, reserving some for Grey team
	var redTeam []*models.Player
	var blueTeam []*models.Player
	var greyPool []*models.Player

	// Shuffle players for team assignment
	rand.Seed(time.Now().UnixNano())
	shuffled := make([]*models.Player, len(players))
	copy(shuffled, players)
	rand.Shuffle(len(shuffled), func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	// Assign players to teams based on role counts
	for i, player := range shuffled {
		if i < greyRoleCount {
			// Mark for Grey team
			player.Team = models.TeamGrey
			greyPool = append(greyPool, player)
		} else if i < greyRoleCount+redRoleCount {
			// Mark for Red team
			player.Team = models.TeamRed
			redTeam = append(redTeam, player)
		} else {
			// Mark for Blue team
			player.Team = models.TeamBlue
			blueTeam = append(blueTeam, player)
		}
	}

	log.Printf("[DEBUG] Team distribution: RED=%d, BLUE=%d, GREY=%d", len(redTeam), len(blueTeam), len(greyPool))

	// Create a temporary config with only selected roles
	tempConfig := &config.RoleConfig{
		ID:            roleConfig.ID,
		Name:          roleConfig.Name,
		NameKo:        roleConfig.NameKo,
		Description:   roleConfig.Description,
		DescriptionKo: roleConfig.DescriptionKo,
		Roles:         selectedRoleDefs,
	}

	// Assign RED team roles
	if err := s.assignTeamRoles(redTeam, config.TeamRed, totalPlayers, tempConfig); err != nil {
		return fmt.Errorf("failed to assign RED team roles: %w", err)
	}

	// Assign BLUE team roles
	if err := s.assignTeamRoles(blueTeam, config.TeamBlue, totalPlayers, tempConfig); err != nil {
		return fmt.Errorf("failed to assign BLUE team roles: %w", err)
	}

	// Assign GREY team roles
	if err := s.assignTeamRoles(greyPool, config.TeamGrey, totalPlayers, tempConfig); err != nil {
		return fmt.Errorf("failed to assign GREY team roles: %w", err)
	}

	return nil
}

// assignTeamRoles assigns roles to a team based on configuration
func (s *GameService) assignTeamRoles(team []*models.Player, teamColor config.TeamColor, totalPlayers int, roleConfig *config.RoleConfig) error {
	log.Printf("[DEBUG] assignTeamRoles: team=%s teamSize=%d totalPlayers=%d", teamColor, len(team), totalPlayers)

	// Filter applicable roles for this team
	// Note: We don't check MinPlayers here because if roles are in the config
	// passed to this function, they were already explicitly selected by the user
	var applicableRoles []config.RoleDefinition
	for _, roleDef := range roleConfig.Roles {
		if roleDef.Team == teamColor {
			applicableRoles = append(applicableRoles, roleDef)
			log.Printf("[DEBUG] Applicable role for %s: %s (priority=%d)", teamColor, roleDef.ID, roleDef.Priority)
		}
	}

	// Sort by priority (lower priority = assigned first)
	sort.Slice(applicableRoles, func(i, j int) bool {
		return applicableRoles[i].Priority < applicableRoles[j].Priority
	})

	// Shuffle team for randomization
	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(team), func(i, j int) {
		team[i], team[j] = team[j], team[i]
	})

	// Assign roles based on priority
	playerIndex := 0
	for _, roleDef := range applicableRoles {
		count := roleDef.Count.GetCount(totalPlayers)
		for i := 0; i < count && playerIndex < len(team); i++ {
			// Create role from config definition
			role := createRoleFromConfig(roleDef)
			team[playerIndex].Role = &role
			log.Printf("[DEBUG] Assigned role %s to player %s (team=%s)", role.ID, team[playerIndex].ID, teamColor)
			playerIndex++
		}
	}

	// Fill remaining players with default operative roles
	if playerIndex < len(team) {
		log.Printf("[DEBUG] Filling %d remaining players with default operative role for team %s", len(team)-playerIndex, teamColor)

		// Find the default operative role for this team
		var defaultRole *config.RoleDefinition
		for _, roleDef := range roleConfig.Roles {
			if roleDef.Team == teamColor && roleDef.Type == config.RoleTypeOperative && roleDef.Priority == 99 {
				defaultRole = &roleDef
				break
			}
		}

		// If no default role found in config, create a basic operative role
		if defaultRole == nil {
			log.Printf("[DEBUG] No default operative role found in config, creating basic role for team %s", teamColor)
			var teamName, teamNameKo, description, descriptionKo, icon string
			switch teamColor {
			case config.TeamRed:
				teamName = "Red Team"
				teamNameKo = "레드 팀원"
				description = "Standard Red Team member"
				descriptionKo = "레드 팀의 일반 요원"
				icon = "⭐"
			case config.TeamBlue:
				teamName = "Blue Team"
				teamNameKo = "블루 팀원"
				description = "Standard Blue Team member"
				descriptionKo = "블루 팀의 일반 요원"
				icon = "⭐"
			case config.TeamGrey:
				teamName = "Grey Team"
				teamNameKo = "그레이 팀원"
				description = "Independent player"
				descriptionKo = "독립 플레이어"
				icon = "⚪"
			}

			basicRole := config.RoleDefinition{
				ID:            string(teamColor) + "_TEAM",
				Name:          teamName,
				NameKo:        teamNameKo,
				Team:          teamColor,
				Type:          config.RoleTypeOperative,
				Description:   description,
				DescriptionKo: descriptionKo,
				Priority:      99,
				Icon:          icon,
			}
			defaultRole = &basicRole
		}

		// Assign default role to remaining players
		for playerIndex < len(team) {
			role := createRoleFromConfig(*defaultRole)
			team[playerIndex].Role = &role
			log.Printf("[DEBUG] Assigned default role %s to player %s (team=%s)", role.ID, team[playerIndex].ID, teamColor)
			playerIndex++
		}
	}

	log.Printf("[DEBUG] Assigned %d roles to %d players in team %s", playerIndex, len(team), teamColor)
	return nil
}

// createRoleFromConfig creates a models.Role from a config.RoleDefinition
func createRoleFromConfig(roleDef config.RoleDefinition) models.Role {
	// Determine if role is a spy (based on type)
	isSpy := roleDef.Type == config.RoleTypeSpy

	// Determine if role is a leader (based on type)
	isLeader := roleDef.Type == config.RoleTypeLeader

	// Convert team color from config to models
	var team models.TeamColor
	switch roleDef.Team {
	case config.TeamRed:
		team = models.TeamRed
	case config.TeamBlue:
		team = models.TeamBlue
	case config.TeamGrey:
		team = models.TeamGrey
	}

	// Create Role from config
	return models.Role{
		ID:            roleDef.ID,
		Name:          roleDef.Name,
		NameKo:        roleDef.NameKo,
		Description:   roleDef.Description,
		DescriptionKo: roleDef.DescriptionKo,
		Team:          team,
		Icon:          roleDef.Icon,
		IsSpy:         isSpy,
		IsLeader:      isLeader,
	}
}

// mapRoleIDToModel maps a role definition ID to a models.Role (legacy, kept for backward compatibility)
func mapRoleIDToModel(roleID string) models.Role {
	// Map configuration role IDs to existing models.Role constants
	switch roleID {
	case "PRESIDENT":
		return models.RolePresident
	case "BOMBER":
		return models.RoleBomber
	case "BLUE_SPY":
		return models.RoleBlueSpy
	case "RED_SPY":
		return models.RoleRedSpy
	case "BLUE_OPERATIVE", "BLUE_TEAM":
		return models.RoleBlueOperative
	case "RED_OPERATIVE", "RED_TEAM":
		return models.RoleRedOperative
	default:
		// For custom roles not in models, create a new Role instance
		// This will need to be enhanced when custom roles are fully supported
		log.Printf("[WARN] Unknown role ID '%s', using default operative", roleID)
		return models.RoleBlueOperative
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

	// Assign roles using configuration
	// Use room's roleConfigId, default to "standard" if not set
	roleConfigID := room.RoleConfigID
	if roleConfigID == "" {
		roleConfigID = "standard"
	}

	// Try config-driven assignment if loader is available
	if s.roleLoader != nil {
		if err := s.AssignRolesWithConfig(room.Players, roleConfigID, room.SelectedRoles); err != nil {
			// Fall back to hardcoded assignment if config fails
			log.Printf("[WARN] Config-driven role assignment failed: %v, falling back to hardcoded", err)
			AssignRoles(room.Players)
		}
	} else {
		// Fall back to hardcoded assignment if no loader
		log.Printf("[WARN] No role loader available, using hardcoded role assignment")
		AssignRoles(room.Players)
	}

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
		// Note: No delay needed with query parameter routing approach
		// as WebSocket connection persists during view changes
		for _, player := range room.Players {
			roleAssignedPayload := map[string]interface{}{
				"role":        player.Role,
				"team":        player.Team,
				"currentRoom": player.CurrentRoom,
			}
			s.hub.SendRoleAssigned(roomCode, player.ID, roleAssignedPayload)
		}
	}

	// Start Round 1 automatically after game starts
	if s.roundManager != nil && s.leaderService != nil {
		log.Printf("[INFO] Automatically starting Round 1 for room=%s", roomCode)

		// Assign leaders first
		if err := s.leaderService.AssignLeaders(sessionID); err != nil {
			log.Printf("[ERROR] Failed to assign leaders: %v", err)
		}

		// Start Round 1
		if err := s.roundManager.StartRound(sessionID, 1); err != nil {
			log.Printf("[ERROR] Failed to start Round 1: %v", err)
		}
	} else {
		log.Printf("[WARN] RoundManager or LeaderService not set, skipping automatic round start")
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
