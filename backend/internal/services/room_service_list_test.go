package services

import (
	"testing"
	"time"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
)

func TestRoomService_GetPublicRooms(t *testing.T) {
	roomStore := store.NewRoomStore()
	service := NewRoomService(roomStore)
	now := time.Now()

	// Create test rooms
	for i := 1; i <= 5; i++ {
		room := &models.Room{
			Code:       generateTestCode(i),
			Status:     models.RoomStatusWaiting,
			IsPublic:   i <= 3, // First 3 public, last 2 private
			MaxPlayers: 10,
			Players:    []*models.Player{},
			CreatedAt:  now.Add(-time.Duration(i) * time.Minute),
			UpdatedAt:  now.Add(-time.Duration(i) * time.Minute),
		}
		roomStore.Create(room)
	}

	t.Run("Get public rooms with default pagination", func(t *testing.T) {
		response, err := service.GetPublicRooms("", 0, 0)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if response.Total != 3 {
			t.Errorf("Expected total=3, got %d", response.Total)
		}

		if response.Limit != 50 {
			t.Errorf("Expected default limit=50, got %d", response.Limit)
		}

		if response.Offset != 0 {
			t.Errorf("Expected offset=0, got %d", response.Offset)
		}

		if len(response.Rooms) != 3 {
			t.Errorf("Expected 3 rooms, got %d", len(response.Rooms))
		}
	})

	t.Run("Get public rooms with custom limit", func(t *testing.T) {
		response, err := service.GetPublicRooms("", 2, 0)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if response.Limit != 2 {
			t.Errorf("Expected limit=2, got %d", response.Limit)
		}

		if len(response.Rooms) != 2 {
			t.Errorf("Expected 2 rooms, got %d", len(response.Rooms))
		}
	})

	t.Run("Limit exceeds maximum", func(t *testing.T) {
		response, err := service.GetPublicRooms("", 200, 0)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if response.Limit != 100 {
			t.Errorf("Expected limit capped at 100, got %d", response.Limit)
		}
	})

	t.Run("Negative offset normalized to 0", func(t *testing.T) {
		response, err := service.GetPublicRooms("", 10, -5)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if response.Offset != 0 {
			t.Errorf("Expected offset=0, got %d", response.Offset)
		}
	})

	t.Run("Invalid status filter", func(t *testing.T) {
		_, err := service.GetPublicRooms("INVALID", 10, 0)
		if err == nil {
			t.Error("Expected error for invalid status")
		}
	})

	t.Run("Filter by WAITING status", func(t *testing.T) {
		response, err := service.GetPublicRooms("WAITING", 10, 0)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		for _, room := range response.Rooms {
			if room.Status != models.RoomStatusWaiting {
				t.Errorf("Expected WAITING status, got %s", room.Status)
			}
		}
	})
}

func TestRoomService_UpdateRoomVisibility(t *testing.T) {
	roomStore := store.NewRoomStore()
	service := NewRoomService(roomStore)
	now := time.Now()

	owner := &models.Player{
		ID:       "player1",
		Nickname: "Owner",
		IsOwner:  true,
	}

	nonOwner := &models.Player{
		ID:       "player2",
		Nickname: "NotOwner",
		IsOwner:  false,
	}

	room := &models.Room{
		Code:       "TEST01",
		Status:     models.RoomStatusWaiting,
		IsPublic:   true,
		MaxPlayers: 10,
		Players:    []*models.Player{owner, nonOwner},
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	roomStore.Create(room)

	t.Run("Owner can update visibility", func(t *testing.T) {
		updatedRoom, err := service.UpdateRoomVisibility("TEST01", "player1", false)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if updatedRoom.IsPublic {
			t.Error("Expected room to be private")
		}
	})

	t.Run("Non-owner cannot update visibility", func(t *testing.T) {
		_, err := service.UpdateRoomVisibility("TEST01", "player2", true)
		if err == nil {
			t.Error("Expected error for non-owner")
		}

		if err.Error() != "only the room owner can change visibility" {
			t.Errorf("Expected ownership error, got %v", err)
		}
	})

	t.Run("Update non-existent room", func(t *testing.T) {
		_, err := service.UpdateRoomVisibility("NOTFOUND", "player1", true)
		if err != models.ErrRoomNotFound {
			t.Errorf("Expected ErrRoomNotFound, got %v", err)
		}
	})

	t.Run("Player not in room", func(t *testing.T) {
		_, err := service.UpdateRoomVisibility("TEST01", "player999", true)
		if err == nil {
			t.Error("Expected error for player not in room")
		}
	})
}

func TestRoomService_CreateRoom_WithIsPublic(t *testing.T) {
	roomStore := store.NewRoomStore()
	service := NewRoomService(roomStore)

	t.Run("Create public room", func(t *testing.T) {
		room, err := service.CreateRoom(10, true)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if !room.IsPublic {
			t.Error("Expected room to be public")
		}

		if room.Code == "" {
			t.Error("Expected room code to be generated")
		}
	})

	t.Run("Create private room", func(t *testing.T) {
		room, err := service.CreateRoom(10, false)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if room.IsPublic {
			t.Error("Expected room to be private")
		}
	})

	t.Run("Private room not in public list", func(t *testing.T) {
		privateRoom, _ := service.CreateRoom(10, false)

		response, err := service.GetPublicRooms("", 50, 0)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		for _, room := range response.Rooms {
			if room.Code == privateRoom.Code {
				t.Error("Private room should not be in public list")
			}
		}
	})

	t.Run("Public room appears in public list", func(t *testing.T) {
		publicRoom, _ := service.CreateRoom(10, true)

		response, err := service.GetPublicRooms("", 50, 0)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		found := false
		for _, room := range response.Rooms {
			if room.Code == publicRoom.Code {
				found = true
				break
			}
		}

		if !found {
			t.Error("Public room should be in public list")
		}
	})
}

// Helper function to generate test room codes
func generateTestCode(i int) string {
	codes := []string{"ROOM01", "ROOM02", "ROOM03", "ROOM04", "ROOM05"}
	if i <= len(codes) {
		return codes[i-1]
	}
	return "ROOMXX"
}
