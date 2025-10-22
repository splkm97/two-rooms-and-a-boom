package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kalee/two-rooms-and-a-boom/internal/handlers"
	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/services"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
)

// setupGameTestRouter creates a test Gin router with game-related routes
func setupGameTestRouter() (*gin.Engine, *store.RoomStore) {
	gin.SetMode(gin.TestMode)
	router := gin.Default()
	roomStore := store.NewRoomStore()

	gameService := services.NewGameService(roomStore)

	gameHandler := handlers.NewGameHandler(gameService)

	v1 := router.Group("/api/v1")
	{
		v1.POST("/rooms/:roomCode/game/start", gameHandler.StartGame)
		v1.POST("/rooms/:roomCode/game/reset", gameHandler.ResetGame)
	}

	return router, roomStore
}

// T063: Contract test for POST /api/v1/rooms/{roomCode}/game/start
func TestStartGame(t *testing.T) {
	tests := []struct {
		name           string
		setupRoom      func(store *store.RoomStore) string // Returns room code
		expectedStatus int
		validateBody   func(t *testing.T, body map[string]interface{})
	}{
		{
			name: "successful game start with 6 players",
			setupRoom: func(store *store.RoomStore) string {
				// Create a room with 6 players (minimum for game start)
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
				store.Create(room)
				return "TEST01"
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify room status changed to IN_PROGRESS
				status, ok := body["status"].(string)
				if !ok || status != "IN_PROGRESS" {
					t.Errorf("Expected status IN_PROGRESS, got %v", status)
				}

				// Verify game session was created
				session, ok := body["gameSession"].(map[string]interface{})
				if !ok {
					t.Errorf("Expected gameSession in response, got %v", body)
					return
				}

				// Verify session ID exists
				sessionID, ok := session["id"].(string)
				if !ok || sessionID == "" {
					t.Errorf("Expected session ID, got %v", sessionID)
				}

				// Verify all players have teams assigned
				players, ok := body["players"].([]interface{})
				if !ok || len(players) != 6 {
					t.Errorf("Expected 6 players, got %v", len(players))
					return
				}

				redTeamCount := 0
				blueTeamCount := 0
				for _, p := range players {
					player := p.(map[string]interface{})
					team, ok := player["team"].(string)
					if !ok || (team != "RED" && team != "BLUE") {
						t.Errorf("Expected team RED or BLUE, got %v", team)
					}
					if team == "RED" {
						redTeamCount++
					} else {
						blueTeamCount++
					}

					// Verify room assignment
					roomColor, ok := player["roomColor"].(string)
					if !ok || (roomColor != "RED_ROOM" && roomColor != "BLUE_ROOM") {
						t.Errorf("Expected roomColor RED_ROOM or BLUE_ROOM, got %v", roomColor)
					}
				}

				// With 6 players (even), teams should be 3-3
				if redTeamCount != 3 || blueTeamCount != 3 {
					t.Errorf("Expected 3 RED and 3 BLUE team members, got RED=%d, BLUE=%d", redTeamCount, blueTeamCount)
				}
			},
		},
		{
			name: "fail to start game with less than 6 players",
			setupRoom: func(store *store.RoomStore) string {
				room := &models.Room{
					Code:       "TEST02",
					Status:     models.RoomStatusWaiting,
					MaxPlayers: 10,
					Players: []*models.Player{
						{ID: "P1", Nickname: "플레이어1", RoomCode: "TEST02", IsOwner: true},
						{ID: "P2", Nickname: "플레이어2", RoomCode: "TEST02", IsOwner: false},
					},
				}
				store.Create(room)
				return "TEST02"
			},
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				code, ok := body["code"].(string)
				if !ok || code != "INSUFFICIENT_PLAYERS" {
					t.Errorf("Expected error code INSUFFICIENT_PLAYERS, got %v", code)
				}
			},
		},
		{
			name: "fail to start game that is already in progress",
			setupRoom: func(store *store.RoomStore) string {
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
						IsOwner:  i == 1,
					})
				}
				store.Create(room)
				return "TEST03"
			},
			expectedStatus: http.StatusConflict,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				code, ok := body["code"].(string)
				if !ok || code != "GAME_ALREADY_STARTED" {
					t.Errorf("Expected error code GAME_ALREADY_STARTED, got %v", code)
				}
			},
		},
		{
			name: "fail to start game for non-existent room",
			setupRoom: func(store *store.RoomStore) string {
				// Don't create any room
				return "NOROOM"
			},
			expectedStatus: http.StatusNotFound,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				code, ok := body["code"].(string)
				if !ok || code != "ROOM_NOT_FOUND" {
					t.Errorf("Expected error code ROOM_NOT_FOUND, got %v", code)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router, store := setupGameTestRouter()
			roomCode := tt.setupRoom(store)

			req, _ := http.NewRequest("POST", "/api/v1/rooms/"+roomCode+"/game/start", nil)
			resp := httptest.NewRecorder()

			router.ServeHTTP(resp, req)

			if resp.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, resp.Code, resp.Body.String())
			}

			var body map[string]interface{}
			if err := json.Unmarshal(resp.Body.Bytes(), &body); err != nil {
				t.Fatalf("Failed to parse response body: %v", err)
			}

			tt.validateBody(t, body)
		})
	}
}

// T086: Contract test for POST /api/v1/rooms/{roomCode}/game/reset
func TestResetGame(t *testing.T) {
	tests := []struct {
		name           string
		setupRoom      func(store *store.RoomStore) string // Returns room code
		expectedStatus int
		validateBody   func(t *testing.T, body map[string]interface{})
	}{
		{
			name: "successful game reset",
			setupRoom: func(store *store.RoomStore) string {
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
				// Add 6 players with roles and teams assigned
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
				store.Create(room)
				return "RESET1"
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify room status changed back to WAITING
				status, ok := body["status"].(string)
				if !ok || status != "WAITING" {
					t.Errorf("Expected status WAITING, got %v", status)
				}

				// Verify game session is null
				session := body["gameSession"]
				if session != nil {
					t.Errorf("Expected gameSession to be null, got %v", session)
				}

				// Verify all players have roles, teams, and rooms cleared
				players, ok := body["players"].([]interface{})
				if !ok || len(players) != 6 {
					t.Errorf("Expected 6 players, got %v", len(players))
					return
				}

				for i, p := range players {
					player := p.(map[string]interface{})

					// Role should be null
					role := player["role"]
					if role != nil {
						t.Errorf("Player %d: Expected role to be null, got %v", i, role)
					}

					// Team should be empty string
					team, ok := player["team"].(string)
					if !ok || team != "" {
						t.Errorf("Player %d: Expected team to be empty, got %v", i, team)
					}

					// CurrentRoom should be empty string
					currentRoom, ok := player["currentRoom"].(string)
					if !ok || currentRoom != "" {
						t.Errorf("Player %d: Expected currentRoom to be empty, got %v", i, currentRoom)
					}
				}
			},
		},
		{
			name: "fail to reset game that is not in progress",
			setupRoom: func(store *store.RoomStore) string {
				room := &models.Room{
					Code:       "RESET2",
					Status:     models.RoomStatusWaiting,
					MaxPlayers: 10,
					Players: []*models.Player{
						{ID: "P1", Nickname: "플레이어1", RoomCode: "RESET2", IsOwner: true},
					},
				}
				store.Create(room)
				return "RESET2"
			},
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				code, ok := body["code"].(string)
				if !ok || code != "GAME_NOT_STARTED" {
					t.Errorf("Expected error code GAME_NOT_STARTED, got %v", code)
				}
			},
		},
		{
			name: "fail to reset game for non-existent room",
			setupRoom: func(store *store.RoomStore) string {
				// Don't create any room
				return "NOROOM"
			},
			expectedStatus: http.StatusNotFound,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				code, ok := body["code"].(string)
				if !ok || code != "ROOM_NOT_FOUND" {
					t.Errorf("Expected error code ROOM_NOT_FOUND, got %v", code)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router, store := setupGameTestRouter()
			roomCode := tt.setupRoom(store)

			req, _ := http.NewRequest("POST", "/api/v1/rooms/"+roomCode+"/game/reset", nil)
			resp := httptest.NewRecorder()

			router.ServeHTTP(resp, req)

			if resp.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, resp.Code, resp.Body.String())
			}

			var body map[string]interface{}
			if err := json.Unmarshal(resp.Body.Bytes(), &body); err != nil {
				t.Fatalf("Failed to parse response body: %v", err)
			}

			tt.validateBody(t, body)
		})
	}
}
