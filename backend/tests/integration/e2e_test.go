package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kalee/two-rooms-and-a-boom/internal/handlers"
	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/services"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
	ws "github.com/kalee/two-rooms-and-a-boom/internal/websocket"
)

// T108: E2E test for complete game flow
// Tests: Create room → Join players → Start game → See roles → Reset game
func TestE2E_CompleteGameFlow(t *testing.T) {
	// Setup test server
	gin.SetMode(gin.TestMode)
	router := gin.Default()
	roomStore := store.NewRoomStore()
	hub := ws.NewHub()
	go hub.Run()

	// Initialize services
	roomService := services.NewRoomService(roomStore)
	playerService := services.NewPlayerService(roomStore, hub)
	gameService := services.NewGameService(roomStore)
	gameService.SetHub(hub)

	// Initialize handlers
	roomHandler := handlers.NewRoomHandler(roomService)
	playerHandler := handlers.NewPlayerHandler(playerService)
	gameHandler := handlers.NewGameHandler(gameService)

	// Setup routes
	v1 := router.Group("/api/v1")
	{
		v1.POST("/rooms", roomHandler.CreateRoom)
		v1.GET("/rooms/:roomCode", roomHandler.GetRoom)
		v1.POST("/rooms/:roomCode/players", playerHandler.JoinRoom)
		v1.PATCH("/rooms/:roomCode/players/:playerId/nickname", playerHandler.UpdateNickname)
		v1.POST("/rooms/:roomCode/game/start", gameHandler.StartGame)
		v1.POST("/rooms/:roomCode/game/reset", gameHandler.ResetGame)
	}

	server := httptest.NewServer(router)
	defer server.Close()

	// Step 1: Create room
	t.Log("Step 1: Creating room...")
	createRoomBody := map[string]interface{}{
		"maxPlayers": 6,
	}
	bodyBytes, _ := json.Marshal(createRoomBody)
	req, _ := http.NewRequest("POST", server.URL+"/api/v1/rooms", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Failed to create room: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Expected status 201, got %d", resp.StatusCode)
	}

	var room struct {
		Code       string `json:"code"`
		Status     string `json:"status"`
		MaxPlayers int    `json:"maxPlayers"`
	}
	json.NewDecoder(resp.Body).Decode(&room)

	if room.Code == "" {
		t.Fatal("Room code is empty")
	}
	if room.Status != "WAITING" {
		t.Errorf("Expected status WAITING, got %s", room.Status)
	}
	t.Logf("✓ Room created with code: %s", room.Code)

	// Step 2: Join 6 players
	t.Log("Step 2: Joining 6 players...")
	players := make([]struct {
		ID       string
		Nickname string
		IsOwner  bool
	}, 6)

	for i := 0; i < 6; i++ {
		req, _ := http.NewRequest("POST", server.URL+"/api/v1/rooms/"+room.Code+"/players", nil)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("Failed to join player %d: %v", i+1, err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("Expected status 201 for player %d, got %d", i+1, resp.StatusCode)
		}

		json.NewDecoder(resp.Body).Decode(&players[i])
		t.Logf("✓ Player %d joined: %s (Owner: %v)", i+1, players[i].Nickname, players[i].IsOwner)
	}

	// Verify first player is owner
	if !players[0].IsOwner {
		t.Error("First player should be owner")
	}

	// Step 3: Get room to verify all players joined
	t.Log("Step 3: Verifying room state...")
	req, _ = http.NewRequest("GET", server.URL+"/api/v1/rooms/"+room.Code, nil)
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Failed to get room: %v", err)
	}
	defer resp.Body.Close()

	var roomState struct {
		Code       string           `json:"code"`
		Status     string           `json:"status"`
		Players    []models.Player  `json:"players"`
		MaxPlayers int              `json:"maxPlayers"`
	}
	json.NewDecoder(resp.Body).Decode(&roomState)

	if len(roomState.Players) != 6 {
		t.Errorf("Expected 6 players, got %d", len(roomState.Players))
	}
	t.Logf("✓ Room has %d players", len(roomState.Players))

	// Step 4: Start game
	t.Log("Step 4: Starting game...")
	req, _ = http.NewRequest("POST", server.URL+"/api/v1/rooms/"+room.Code+"/game/start", nil)
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Failed to start game: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", resp.StatusCode)
	}

	var gameStarted struct {
		Code        string `json:"code"`
		Status      string `json:"status"`
		GameSession struct {
			ID        string    `json:"id"`
			RoomCode  string    `json:"roomCode"`
			StartedAt time.Time `json:"startedAt"`
		} `json:"gameSession"`
		Players []models.Player `json:"players"`
	}
	json.NewDecoder(resp.Body).Decode(&gameStarted)

	if gameStarted.Status != "IN_PROGRESS" {
		t.Errorf("Expected status IN_PROGRESS, got %s", gameStarted.Status)
	}
	if gameStarted.GameSession.ID == "" {
		t.Error("Game session ID is empty")
	}
	t.Logf("✓ Game started with session ID: %s", gameStarted.GameSession.ID)

	// Step 5: Verify role assignments
	t.Log("Step 5: Verifying role assignments...")
	presidentCount := 0
	bomberCount := 0
	redTeamCount := 0
	blueTeamCount := 0
	redRoomCount := 0
	blueRoomCount := 0

	for i, player := range gameStarted.Players {
		if player.Role == nil {
			t.Errorf("Player %d has no role assigned", i+1)
			continue
		}

		t.Logf("Player %d: Role=%s, Team=%s, Room=%s",
			i+1, player.Role.Name, player.Team, player.CurrentRoom)

		// Count roles
		if player.Role.Name == "대통령" {
			presidentCount++
		} else if player.Role.Name == "폭파범" {
			bomberCount++
		}

		// Count teams
		if player.Team == models.TeamRed {
			redTeamCount++
		} else if player.Team == models.TeamBlue {
			blueTeamCount++
		}

		// Count rooms
		if player.CurrentRoom == models.RedRoom {
			redRoomCount++
		} else if player.CurrentRoom == models.BlueRoom {
			blueRoomCount++
		}
	}

	// Verify role distribution (FR-009, FR-010, FR-011)
	if presidentCount != 1 {
		t.Errorf("Expected 1 president, got %d", presidentCount)
	}
	if bomberCount != 1 {
		t.Errorf("Expected 1 bomber, got %d", bomberCount)
	}

	// Verify team distribution (FR-008)
	if redTeamCount != 3 || blueTeamCount != 3 {
		t.Errorf("Expected 3-3 team split, got Red=%d Blue=%d", redTeamCount, blueTeamCount)
	}

	// Verify room distribution (FR-013)
	if redRoomCount != 3 || blueRoomCount != 3 {
		t.Errorf("Expected 3-3 room split, got Red=%d Blue=%d", redRoomCount, blueRoomCount)
	}

	t.Log("✓ All roles and assignments verified")

	// Step 6: Reset game
	t.Log("Step 6: Resetting game...")
	req, _ = http.NewRequest("POST", server.URL+"/api/v1/rooms/"+room.Code+"/game/reset", nil)
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Failed to reset game: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", resp.StatusCode)
	}

	var resetRoom struct {
		Code        string           `json:"code"`
		Status      string           `json:"status"`
		GameSession interface{}      `json:"gameSession"`
		Players     []models.Player  `json:"players"`
	}
	json.NewDecoder(resp.Body).Decode(&resetRoom)

	if resetRoom.Status != "WAITING" {
		t.Errorf("Expected status WAITING after reset, got %s", resetRoom.Status)
	}
	if resetRoom.GameSession != nil {
		t.Error("Game session should be nil after reset")
	}

	// Verify all players have no roles/teams/rooms
	for i, player := range resetRoom.Players {
		if player.Role != nil {
			t.Errorf("Player %d still has role after reset", i+1)
		}
		if player.Team != "" {
			t.Errorf("Player %d still has team after reset", i+1)
		}
		if player.CurrentRoom != "" {
			t.Errorf("Player %d still has room after reset", i+1)
		}
	}

	t.Log("✓ Game reset successfully")
	t.Log("=== E2E Test Complete ===")
}
