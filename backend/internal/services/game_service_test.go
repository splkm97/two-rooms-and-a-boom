package services

import (
	"testing"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
)

// T064: Unit test for team assignment algorithm (AssignTeams - FR-008)
func TestAssignTeams(t *testing.T) {
	tests := []struct {
		name          string
		playerCount   int
		expectedRed   int
		expectedBlue  int
	}{
		{
			name:          "6 players (even) - teams split equally",
			playerCount:   6,
			expectedRed:   3,
			expectedBlue:  3,
		},
		{
			name:          "7 players (odd) - red team gets extra player (FR-008)",
			playerCount:   7,
			expectedRed:   4,
			expectedBlue:  3,
		},
		{
			name:          "10 players (even) - teams split equally",
			playerCount:   10,
			expectedRed:   5,
			expectedBlue:  5,
		},
		{
			name:          "11 players (odd) - red team gets extra player",
			playerCount:   11,
			expectedRed:   6,
			expectedBlue:  5,
		},
		{
			name:          "30 players (even) - teams split equally",
			playerCount:   30,
			expectedRed:   15,
			expectedBlue:  15,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create test players
			players := make([]*models.Player, tt.playerCount)
			for i := 0; i < tt.playerCount; i++ {
				players[i] = &models.Player{
					ID:       string(rune('A' + i)),
					Nickname: string(rune('플' + i)),
				}
			}

			// Assign teams
			AssignTeams(players)

			// Count team assignments
			redCount := 0
			blueCount := 0
			for _, player := range players {
				switch player.Team {
				case models.TeamRed:
					redCount++
				case models.TeamBlue:
					blueCount++
				default:
					t.Errorf("Player %s has invalid team: %s", player.ID, player.Team)
				}
			}

			if redCount != tt.expectedRed {
				t.Errorf("Expected %d red team players, got %d", tt.expectedRed, redCount)
			}
			if blueCount != tt.expectedBlue {
				t.Errorf("Expected %d blue team players, got %d", tt.expectedBlue, blueCount)
			}
		})
	}
}

// T065: Unit test for role distribution (1 president, 1 bomber, spies by player count)
func TestAssignRoles(t *testing.T) {
	tests := []struct {
		name                string
		playerCount         int
		expectedPresident   int
		expectedBomber      int
		expectedRedSpies    int
		expectedBlueSpies   int
		expectedOperatives  int
	}{
		{
			name:                "6 players - 1 president, 1 bomber, 1 spy per team, 2 operatives",
			playerCount:         6,
			expectedPresident:   1,
			expectedBomber:      1,
			expectedRedSpies:    1,
			expectedBlueSpies:   1,
			expectedOperatives:  2,
		},
		{
			name:                "7 players - 1 president, 1 bomber, 1 spy per team, 3 operatives",
			playerCount:         7,
			expectedPresident:   1,
			expectedBomber:      1,
			expectedRedSpies:    1,
			expectedBlueSpies:   1,
			expectedOperatives:  3,
		},
		{
			name:                "10 players - 1 president, 1 bomber, 2 spies per team, 4 operatives",
			playerCount:         10,
			expectedPresident:   1,
			expectedBomber:      1,
			expectedRedSpies:    2,
			expectedBlueSpies:   2,
			expectedOperatives:  4,
		},
		{
			name:                "15 players - 1 president, 1 bomber, 2 spies per team, 9 operatives",
			playerCount:         15,
			expectedPresident:   1,
			expectedBomber:      1,
			expectedRedSpies:    2,
			expectedBlueSpies:   2,
			expectedOperatives:  9,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create test players with team assignments
			players := make([]*models.Player, tt.playerCount)
			for i := 0; i < tt.playerCount; i++ {
				team := models.TeamRed
				if i%2 == 1 {
					team = models.TeamBlue
				}
				players[i] = &models.Player{
					ID:       string(rune('A' + i)),
					Nickname: string(rune('플' + i)),
					Team:     team,
				}
			}

			// Assign roles
			AssignRoles(players)

			// Count role assignments
			presidentCount := 0
			bomberCount := 0
			redSpyCount := 0
			blueSpyCount := 0
			redOperativeCount := 0
			blueOperativeCount := 0

			for _, player := range players {
				if player.Role == nil {
					t.Errorf("Player %s has no role assigned", player.ID)
					continue
				}

				switch player.Role.ID {
				case "PRESIDENT":
					presidentCount++
					if player.Team != models.TeamBlue {
						t.Errorf("President must be on blue team, got %s", player.Team)
					}
				case "BOMBER":
					bomberCount++
					if player.Team != models.TeamRed {
						t.Errorf("Bomber must be on red team, got %s", player.Team)
					}
				case "RED_SPY":
					redSpyCount++
					if player.Team != models.TeamRed {
						t.Errorf("Red spy must be on red team, got %s", player.Team)
					}
				case "BLUE_SPY":
					blueSpyCount++
					if player.Team != models.TeamBlue {
						t.Errorf("Blue spy must be on blue team, got %s", player.Team)
					}
				case "RED_OPERATIVE":
					redOperativeCount++
				case "BLUE_OPERATIVE":
					blueOperativeCount++
				default:
					t.Errorf("Unknown role ID: %s (Name: %s)", player.Role.ID, player.Role.Name)
				}
			}

			if presidentCount != tt.expectedPresident {
				t.Errorf("Expected %d president, got %d", tt.expectedPresident, presidentCount)
			}
			if bomberCount != tt.expectedBomber {
				t.Errorf("Expected %d bomber, got %d", tt.expectedBomber, bomberCount)
			}
			if redSpyCount != tt.expectedRedSpies {
				t.Errorf("Expected %d red spies, got %d", tt.expectedRedSpies, redSpyCount)
			}
			if blueSpyCount != tt.expectedBlueSpies {
				t.Errorf("Expected %d blue spies, got %d", tt.expectedBlueSpies, blueSpyCount)
			}

			totalOperatives := redOperativeCount + blueOperativeCount
			if totalOperatives != tt.expectedOperatives {
				t.Errorf("Expected %d operatives, got %d", tt.expectedOperatives, totalOperatives)
			}
		})
	}
}

// T066: Unit test for room assignment algorithm (AssignRooms - FR-013)
func TestAssignRooms(t *testing.T) {
	tests := []struct {
		name                string
		playerCount         int
		expectedRedRoom     int
		expectedBlueRoom    int
	}{
		{
			name:                "6 players - equal split 3-3",
			playerCount:         6,
			expectedRedRoom:     3,
			expectedBlueRoom:    3,
		},
		{
			name:                "7 players - 4-3 or 3-4 split",
			playerCount:         7,
			expectedRedRoom:     -1, // Will check that it's either 3 or 4
			expectedBlueRoom:    -1,
		},
		{
			name:                "10 players - equal split 5-5",
			playerCount:         10,
			expectedRedRoom:     5,
			expectedBlueRoom:    5,
		},
		{
			name:                "30 players - equal split 15-15",
			playerCount:         30,
			expectedRedRoom:     15,
			expectedBlueRoom:    15,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create test players
			players := make([]*models.Player, tt.playerCount)
			for i := 0; i < tt.playerCount; i++ {
				players[i] = &models.Player{
					ID:       string(rune('A' + i)),
					Nickname: string(rune('플' + i)),
				}
			}

			// Assign rooms
			AssignRooms(players)

			// Count room assignments
			redRoomCount := 0
			blueRoomCount := 0
			for _, player := range players {
				switch player.CurrentRoom {
				case models.RedRoom:
					redRoomCount++
				case models.BlueRoom:
					blueRoomCount++
				default:
					t.Errorf("Player %s has invalid room: %s", player.ID, player.CurrentRoom)
				}
			}

			if tt.expectedRedRoom == -1 {
				// For odd player counts, check that rooms differ by at most 1
				diff := redRoomCount - blueRoomCount
				if diff < -1 || diff > 1 {
					t.Errorf("Room split too uneven: RED=%d, BLUE=%d", redRoomCount, blueRoomCount)
				}
				// Check total
				if redRoomCount+blueRoomCount != tt.playerCount {
					t.Errorf("Expected total %d players, got RED=%d + BLUE=%d = %d",
						tt.playerCount, redRoomCount, blueRoomCount, redRoomCount+blueRoomCount)
				}
			} else {
				if redRoomCount != tt.expectedRedRoom {
					t.Errorf("Expected %d red room players, got %d", tt.expectedRedRoom, redRoomCount)
				}
				if blueRoomCount != tt.expectedBlueRoom {
					t.Errorf("Expected %d blue room players, got %d", tt.expectedBlueRoom, blueRoomCount)
				}
			}
		})
	}
}

// Integration test for GameService.StartGame
func TestGameService_StartGame(t *testing.T) {
	t.Run("successfully starts game with 6 players", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		gameService := NewGameService(roomStore)

		// Create a room with 6 players
		room := &models.Room{
			Code:       "TEST01",
			Status:     models.RoomStatusWaiting,
			MaxPlayers: 10,
			Players:    []*models.Player{},
		}
		for i := 1; i <= 6; i++ {
			room.Players = append(room.Players, &models.Player{
				ID:          string(rune('A' + i - 1)),
				Nickname:    string(rune('플' + i - 1)),
				IsAnonymous: true,
				RoomCode:    "TEST01",
				IsOwner:     i == 1,
			})
		}
		roomStore.Create(room)

		// Start the game
		session, err := gameService.StartGame("TEST01")

		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if session == nil {
			t.Fatal("Expected game session, got nil")
		}

		// Verify session ID
		if session.ID == "" {
			t.Error("Expected session ID, got empty string")
		}

		// Verify room status changed
		updatedRoom, _ := roomStore.Get("TEST01")
		if updatedRoom.Status != models.RoomStatusInProgress {
			t.Errorf("Expected room status IN_PROGRESS, got %s", updatedRoom.Status)
		}

		// Verify all players have teams, roles, and rooms assigned
		for _, player := range updatedRoom.Players {
			if player.Team == "" {
				t.Errorf("Player %s has no team assigned", player.ID)
			}
			if player.Role == nil {
				t.Errorf("Player %s has no role assigned", player.ID)
			}
			if player.CurrentRoom == "" {
				t.Errorf("Player %s has no room assigned", player.ID)
			}
		}
	})

	t.Run("fails to start game with less than 6 players", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		gameService := NewGameService(roomStore)

		room := &models.Room{
			Code:       "TEST02",
			Status:     models.RoomStatusWaiting,
			MaxPlayers: 10,
			Players: []*models.Player{
				{ID: "P1", Nickname: "플레이어1", RoomCode: "TEST02"},
				{ID: "P2", Nickname: "플레이어2", RoomCode: "TEST02"},
			},
		}
		roomStore.Create(room)

		_, err := gameService.StartGame("TEST02")

		if err == nil {
			t.Fatal("Expected error for insufficient players, got nil")
		}
	})

	t.Run("fails to start game that is already in progress", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		gameService := NewGameService(roomStore)

		room := &models.Room{
			Code:       "TEST03",
			Status:     models.RoomStatusInProgress,
			MaxPlayers: 10,
			Players:    []*models.Player{},
		}
		for i := 1; i <= 6; i++ {
			room.Players = append(room.Players, &models.Player{
				ID:       string(rune('A' + i - 1)),
				Nickname: string(rune('플' + i - 1)),
				RoomCode: "TEST03",
			})
		}
		roomStore.Create(room)

		_, err := gameService.StartGame("TEST03")

		if err == nil {
			t.Fatal("Expected error for game already started, got nil")
		}
	})
}

// T087: Unit test for GameService.ResetGame
func TestGameService_ResetGame(t *testing.T) {
	t.Run("successfully resets game in progress", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		gameService := NewGameService(roomStore)

		// Create a room with a game in progress
		room := &models.Room{
			Code:       "RESET1",
			Status:     models.RoomStatusInProgress,
			MaxPlayers: 10,
			Players:    []*models.Player{},
			GameSession: &models.GameSession{
				ID:       "session-123",
				RoomCode: "RESET1",
			},
		}

		// Add 6 players with roles, teams, and rooms assigned
		for i := 1; i <= 6; i++ {
			role := &models.Role{
				ID:          "ROLE" + string(rune('0'+i)),
				Name:        "역할" + string(rune('0'+i)),
				Description: "설명",
				Team:        models.TeamRed,
			}
			player := &models.Player{
				ID:          string(rune('A' + i - 1)),
				Nickname:    "플레이어" + string(rune('0'+i)),
				IsAnonymous: true,
				RoomCode:    "RESET1",
				IsOwner:     i == 1,
				Role:        role,
				Team:        models.TeamRed,
				CurrentRoom: models.RedRoom,
			}
			room.Players = append(room.Players, player)
		}
		roomStore.Create(room)

		// Reset the game
		err := gameService.ResetGame("RESET1")

		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Verify room status changed back to WAITING
		updatedRoom, _ := roomStore.Get("RESET1")
		if updatedRoom.Status != models.RoomStatusWaiting {
			t.Errorf("Expected room status WAITING, got %s", updatedRoom.Status)
		}

		// Verify game session is nil
		if updatedRoom.GameSession != nil {
			t.Errorf("Expected game session to be nil, got %v", updatedRoom.GameSession)
		}

		// Verify all players have roles, teams, and rooms cleared
		for _, player := range updatedRoom.Players {
			if player.Role != nil {
				t.Errorf("Player %s still has role assigned: %v", player.ID, player.Role)
			}
			if player.Team != "" {
				t.Errorf("Player %s still has team assigned: %s", player.ID, player.Team)
			}
			if player.CurrentRoom != "" {
				t.Errorf("Player %s still has room assigned: %s", player.ID, player.CurrentRoom)
			}
		}
	})

	t.Run("fails to reset game that is not in progress", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		gameService := NewGameService(roomStore)

		room := &models.Room{
			Code:       "RESET2",
			Status:     models.RoomStatusWaiting,
			MaxPlayers: 10,
			Players: []*models.Player{
				{ID: "P1", Nickname: "플레이어1", RoomCode: "RESET2", IsOwner: true},
			},
		}
		roomStore.Create(room)

		err := gameService.ResetGame("RESET2")

		if err == nil {
			t.Fatal("Expected error for game not started, got nil")
		}
	})

	t.Run("fails to reset game for non-existent room", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		gameService := NewGameService(roomStore)

		err := gameService.ResetGame("NOROOM")

		if err == nil {
			t.Fatal("Expected error for room not found, got nil")
		}
	})
}
