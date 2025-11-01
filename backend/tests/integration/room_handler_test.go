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

// setupTestRouter creates a test Gin router with all routes configured
func setupTestRouter() (*gin.Engine, *store.RoomStore) {
	gin.SetMode(gin.TestMode)
	router := gin.Default()
	roomStore := store.NewRoomStore()

	roomService := services.NewRoomService(roomStore)
	playerService := services.NewPlayerService(roomStore, nil)

	roomHandler := handlers.NewRoomHandler(roomService)
	playerHandler := handlers.NewPlayerHandler(playerService)

	v1 := router.Group("/api/v1")
	{
		v1.POST("/rooms", roomHandler.CreateRoom)
		v1.GET("/rooms/:roomCode", roomHandler.GetRoom)
		v1.POST("/rooms/:roomCode/players", playerHandler.JoinRoom)
		v1.PATCH("/rooms/:roomCode/players/:playerId/nickname", playerHandler.UpdateNickname)
	}

	return router, roomStore
}

// T027: Contract test for POST /api/v1/rooms
func TestCreateRoom(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		validateBody   func(t *testing.T, body map[string]interface{})
	}{
		{
			name: "successful room creation with valid maxPlayers",
			requestBody: map[string]interface{}{
				"maxPlayers": 10,
			},
			expectedStatus: http.StatusCreated,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify room code is generated (6 characters)
				code, ok := body["code"].(string)
				if !ok || len(code) != 6 {
					t.Errorf("Expected 6-character room code, got %v", code)
				}

				// Verify status is WAITING
				status, ok := body["status"].(string)
				if !ok || status != "WAITING" {
					t.Errorf("Expected status WAITING, got %v", status)
				}

				// Verify maxPlayers matches request
				maxPlayers, ok := body["maxPlayers"].(float64)
				if !ok || int(maxPlayers) != 10 {
					t.Errorf("Expected maxPlayers 10, got %v", maxPlayers)
				}

				// Verify players array is empty
				players, ok := body["players"].([]interface{})
				if !ok || len(players) != 0 {
					t.Errorf("Expected empty players array, got %v", players)
				}

				// Verify createdAt and updatedAt are present
				if _, ok := body["createdAt"]; !ok {
					t.Error("Expected createdAt field")
				}
				if _, ok := body["updatedAt"]; !ok {
					t.Error("Expected updatedAt field")
				}
			},
		},
		{
			name: "reject maxPlayers below minimum (6)",
			requestBody: map[string]interface{}{
				"maxPlayers": 5,
			},
			expectedStatus: http.StatusBadRequest,
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
			name: "reject maxPlayers above maximum (30)",
			requestBody: map[string]interface{}{
				"maxPlayers": 31,
			},
			expectedStatus: http.StatusBadRequest,
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
			name: "reject missing maxPlayers",
			requestBody: map[string]interface{}{},
			expectedStatus: http.StatusBadRequest,
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
			router, _ := setupTestRouter()

			// Prepare request
			bodyBytes, err := json.Marshal(tt.requestBody)
			if err != nil {
				t.Fatalf("Failed to marshal request body: %v", err)
			}

			req, err := http.NewRequest("POST", "/api/v1/rooms", bytes.NewBuffer(bodyBytes))
			if err != nil {
				t.Fatalf("Failed to create request: %v", err)
			}
			req.Header.Set("Content-Type", "application/json")

			// Execute request
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Verify status code
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
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

// T028: Contract test for GET /api/v1/rooms/{roomCode}
func TestGetRoom(t *testing.T) {
	tests := []struct {
		name           string
		setupRoom      func(store *store.RoomStore) string
		roomCode       string
		expectedStatus int
		validateBody   func(t *testing.T, body map[string]interface{})
	}{
		{
			name: "successfully retrieve existing room",
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
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body map[string]interface{}) {
				// Verify room code is present
				if _, ok := body["code"]; !ok {
					t.Error("Expected code field")
				}

				// Verify status
				status, ok := body["status"].(string)
				if !ok || status != "WAITING" {
					t.Errorf("Expected status WAITING, got %v", status)
				}

				// Verify players array
				if _, ok := body["players"]; !ok {
					t.Error("Expected players field")
				}
			},
		},
		{
			name: "return 404 for non-existent room",
			setupRoom: func(store *store.RoomStore) string {
				return "NONEXIST" // This room code doesn't exist
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
			name: "return 400 for invalid room code format",
			setupRoom: func(store *store.RoomStore) string {
				return "ABC" // Invalid: less than 6 characters
			},
			roomCode:       "ABC",
			expectedStatus: http.StatusBadRequest,
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
			var roomCode string
			if tt.setupRoom != nil {
				roomCode = tt.setupRoom(roomStore)
			}
			if tt.roomCode != "" {
				roomCode = tt.roomCode
			}

			// Prepare request
			req, err := http.NewRequest("GET", "/api/v1/rooms/"+roomCode, nil)
			if err != nil {
				t.Fatalf("Failed to create request: %v", err)
			}

			// Execute request
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Verify status code
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
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
