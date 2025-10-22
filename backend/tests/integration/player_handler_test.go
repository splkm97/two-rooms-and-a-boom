package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/services"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
)

// T029: Contract test for POST /api/v1/rooms/{roomCode}/players
func TestJoinRoom(t *testing.T) {
	tests := []struct {
		name           string
		setupRoom      func(store *store.RoomStore) string
		roomCode       string
		expectedStatus int
		validateBody   func(t *testing.T, body map[string]interface{})
	}{
		{
			name: "successfully join existing room with WAITING status",
			setupRoom: func(store *store.RoomStore) string {
				room := &models.Room{
					Code:       services.GenerateRoomCode(),
					Status:     models.RoomStatusWaiting,
					Players:    []*models.Player{},
					MaxPlayers: 10,
				}
				store.Create(room)
				return room.Code
			},
			expectedStatus: http.StatusCreated,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify player ID is generated
				if id, ok := body["id"].(string); !ok || id == "" {
					t.Errorf("Expected player ID, got %v", body["id"])
				}

				// Verify anonymous nickname is assigned
				nickname, ok := body["nickname"].(string)
				if !ok || nickname == "" {
					t.Errorf("Expected nickname, got %v", nickname)
				}

				// Verify isAnonymous is true
				isAnonymous, ok := body["isAnonymous"].(bool)
				if !ok || !isAnonymous {
					t.Errorf("Expected isAnonymous true, got %v", isAnonymous)
				}

				// Verify roomCode matches
				if _, ok := body["roomCode"]; !ok {
					t.Error("Expected roomCode field")
				}

				// Verify first player is owner
				isOwner, ok := body["isOwner"].(bool)
				if !ok || !isOwner {
					t.Errorf("Expected first player to be owner, got %v", isOwner)
				}

				// Verify connectedAt timestamp
				if _, ok := body["connectedAt"]; !ok {
					t.Error("Expected connectedAt field")
				}
			},
		},
		{
			name: "second player joins with isOwner false",
			setupRoom: func(store *store.RoomStore) string {
				room := &models.Room{
					Code:       services.GenerateRoomCode(),
					Status:     models.RoomStatusWaiting,
					Players:    []*models.Player{
						{
							ID:          "player1",
							Nickname:    "플레이어1",
							IsAnonymous: true,
							IsOwner:     true,
							RoomCode:    "",
						},
					},
					MaxPlayers: 10,
				}
				room.Players[0].RoomCode = room.Code
				store.Create(room)
				return room.Code
			},
			expectedStatus: http.StatusCreated,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify isOwner is false for second player
				isOwner, ok := body["isOwner"].(bool)
				if !ok || isOwner {
					t.Errorf("Expected isOwner false for second player, got %v", isOwner)
				}
			},
		},
		{
			name: "return 404 for non-existent room",
			setupRoom: func(store *store.RoomStore) string {
				return "NONEXIST"
			},
			roomCode:       "NONEXIST",
			expectedStatus: http.StatusNotFound,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify error structure
				if _, ok := body["code"]; !ok {
					t.Error("Expected error code field")
				}
				if _, ok := body["message"]; !ok {
					t.Error("Expected error message field")
				}
			},
		},
		{
			name: "return 409 when room is full",
			setupRoom: func(store *store.RoomStore) string {
				room := &models.Room{
					Code:       services.GenerateRoomCode(),
					Status:     models.RoomStatusWaiting,
					Players:    make([]*models.Player, 0),
					MaxPlayers: 6,
				}
				// Add 6 players (full room)
				for i := 0; i < 6; i++ {
					player := &models.Player{
						ID:          string(rune('A' + i)),
						Nickname:    "플레이어" + string(rune('1'+i)),
						IsAnonymous: true,
						IsOwner:     i == 0,
						RoomCode:    room.Code,
					}
					room.Players = append(room.Players, player)
				}
				store.Create(room)
				return room.Code
			},
			expectedStatus: http.StatusConflict,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify error code is ROOM_FULL
				code, ok := body["code"].(string)
				if !ok || code != "ROOM_FULL" {
					t.Errorf("Expected error code ROOM_FULL, got %v", code)
				}
			},
		},
		{
			name: "return 409 when game already started",
			setupRoom: func(store *store.RoomStore) string {
				room := &models.Room{
					Code:       services.GenerateRoomCode(),
					Status:     models.RoomStatusInProgress,
					Players:    []*models.Player{},
					MaxPlayers: 10,
				}
				store.Create(room)
				return room.Code
			},
			expectedStatus: http.StatusConflict,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify error code is GAME_ALREADY_STARTED
				code, ok := body["code"].(string)
				if !ok || code != "GAME_ALREADY_STARTED" {
					t.Errorf("Expected error code GAME_ALREADY_STARTED, got %v", code)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router, roomStore := setupTestRouter()

			// Setup test data
			var roomCode string
			if tt.setupRoom != nil {
				roomCode = tt.setupRoom(roomStore)
			}
			if tt.roomCode != "" {
				roomCode = tt.roomCode
			}

			// Prepare request
			req, err := http.NewRequest("POST", "/api/v1/rooms/"+roomCode+"/players", nil)
			if err != nil {
				t.Fatalf("Failed to create request: %v", err)
			}
			req.Header.Set("Content-Type", "application/json")

			// Execute request
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Verify status code
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Response: %s", tt.expectedStatus, w.Code, w.Body.String())
			}

			// Parse response body
			var responseBody map[string]interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &responseBody); err != nil {
				t.Fatalf("Failed to parse response body: %v", err)
			}

			// Validate response body
			if tt.validateBody != nil {
				tt.validateBody(t, responseBody)
			}
		})
	}
}

// T030: Contract test for PATCH /api/v1/rooms/{roomCode}/players/{playerId}/nickname
func TestUpdateNickname(t *testing.T) {
	tests := []struct {
		name           string
		setupRoom      func(store *store.RoomStore) (roomCode, playerId string)
		requestBody    map[string]interface{}
		expectedStatus int
		validateBody   func(t *testing.T, body map[string]interface{})
	}{
		{
			name: "successfully update nickname",
			setupRoom: func(store *store.RoomStore) (string, string) {
				room := &models.Room{
					Code:       services.GenerateRoomCode(),
					Status:     models.RoomStatusWaiting,
					Players:    []*models.Player{
						{
							ID:          "player1",
							Nickname:    "플레이어1",
							IsAnonymous: true,
							IsOwner:     true,
							RoomCode:    "",
						},
					},
					MaxPlayers: 10,
				}
				room.Players[0].RoomCode = room.Code
				store.Create(room)
				return room.Code, room.Players[0].ID
			},
			requestBody: map[string]interface{}{
				"nickname": "새로운닉네임",
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify nickname is updated
				nickname, ok := body["nickname"].(string)
				if !ok || nickname != "새로운닉네임" {
					t.Errorf("Expected nickname '새로운닉네임', got %v", nickname)
				}

				// Verify isAnonymous is now false
				isAnonymous, ok := body["isAnonymous"].(bool)
				if !ok || isAnonymous {
					t.Errorf("Expected isAnonymous false after custom nickname, got %v", isAnonymous)
				}
			},
		},
		{
			name: "handle duplicate nickname by adding suffix",
			setupRoom: func(store *store.RoomStore) (string, string) {
				room := &models.Room{
					Code:       services.GenerateRoomCode(),
					Status:     models.RoomStatusWaiting,
					Players:    []*models.Player{
						{
							ID:          "player1",
							Nickname:    "중복닉네임",
							IsAnonymous: false,
							IsOwner:     true,
							RoomCode:    "",
						},
						{
							ID:          "player2",
							Nickname:    "플레이어2",
							IsAnonymous: true,
							IsOwner:     false,
							RoomCode:    "",
						},
					},
					MaxPlayers: 10,
				}
				room.Players[0].RoomCode = room.Code
				room.Players[1].RoomCode = room.Code
				store.Create(room)
				return room.Code, room.Players[1].ID
			},
			requestBody: map[string]interface{}{
				"nickname": "중복닉네임",
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify nickname has suffix (e.g., "중복닉네임 (2)")
				nickname, ok := body["nickname"].(string)
				if !ok || nickname == "중복닉네임" {
					t.Errorf("Expected nickname with suffix, got %v", nickname)
				}
				// Should be something like "중복닉네임 (2)" or "중복닉네임 2"
			},
		},
		{
			name: "reject nickname shorter than 2 characters",
			setupRoom: func(store *store.RoomStore) (string, string) {
				room := &models.Room{
					Code:       services.GenerateRoomCode(),
					Status:     models.RoomStatusWaiting,
					Players:    []*models.Player{
						{
							ID:          "player1",
							Nickname:    "플레이어1",
							IsAnonymous: true,
							IsOwner:     true,
							RoomCode:    "",
						},
					},
					MaxPlayers: 10,
				}
				room.Players[0].RoomCode = room.Code
				store.Create(room)
				return room.Code, room.Players[0].ID
			},
			requestBody: map[string]interface{}{
				"nickname": "A",
			},
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify error code
				code, ok := body["code"].(string)
				if !ok || code != "INVALID_NICKNAME" {
					t.Errorf("Expected error code INVALID_NICKNAME, got %v", code)
				}
			},
		},
		{
			name: "reject nickname longer than 20 characters",
			setupRoom: func(store *store.RoomStore) (string, string) {
				room := &models.Room{
					Code:       services.GenerateRoomCode(),
					Status:     models.RoomStatusWaiting,
					Players:    []*models.Player{
						{
							ID:          "player1",
							Nickname:    "플레이어1",
							IsAnonymous: true,
							IsOwner:     true,
							RoomCode:    "",
						},
					},
					MaxPlayers: 10,
				}
				room.Players[0].RoomCode = room.Code
				store.Create(room)
				return room.Code, room.Players[0].ID
			},
			requestBody: map[string]interface{}{
				"nickname": "가나다라마바사아자차카타파하ABCDEFG",
			},
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify error code
				code, ok := body["code"].(string)
				if !ok || code != "INVALID_NICKNAME" {
					t.Errorf("Expected error code INVALID_NICKNAME, got %v", code)
				}
			},
		},
		{
			name: "return 404 for non-existent player",
			setupRoom: func(store *store.RoomStore) (string, string) {
				room := &models.Room{
					Code:       services.GenerateRoomCode(),
					Status:     models.RoomStatusWaiting,
					Players:    []*models.Player{},
					MaxPlayers: 10,
				}
				store.Create(room)
				return room.Code, "NONEXIST"
			},
			requestBody: map[string]interface{}{
				"nickname": "테스트닉네임",
			},
			expectedStatus: http.StatusNotFound,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify error structure
				if _, ok := body["code"]; !ok {
					t.Error("Expected error code field")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router, roomStore := setupTestRouter()

			// Setup test data
			roomCode, playerId := tt.setupRoom(roomStore)

			// Prepare request
			bodyBytes, err := json.Marshal(tt.requestBody)
			if err != nil {
				t.Fatalf("Failed to marshal request body: %v", err)
			}

			req, err := http.NewRequest("PATCH", "/api/v1/rooms/"+roomCode+"/players/"+playerId+"/nickname", bytes.NewBuffer(bodyBytes))
			if err != nil {
				t.Fatalf("Failed to create request: %v", err)
			}
			req.Header.Set("Content-Type", "application/json")

			// Execute request
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Verify status code
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Response: %s", tt.expectedStatus, w.Code, w.Body.String())
			}

			// Parse response body
			var responseBody map[string]interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &responseBody); err != nil {
				t.Fatalf("Failed to parse response body: %v", err)
			}

			// Validate response body
			if tt.validateBody != nil {
				tt.validateBody(t, responseBody)
			}
		})
	}
}
