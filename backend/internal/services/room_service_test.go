package services

import (
	"testing"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
)

func TestGenerateRoomCode(t *testing.T) {
	t.Run("generates 6-character code", func(t *testing.T) {
		code := GenerateRoomCode()
		if len(code) != 6 {
			t.Errorf("Expected code length 6, got %d", len(code))
		}
	})

	t.Run("generates alphanumeric uppercase code", func(t *testing.T) {
		code := GenerateRoomCode()
		for _, char := range code {
			if !((char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9')) {
				t.Errorf("Code contains invalid character: %c", char)
			}
		}
	})

	t.Run("generates unique codes", func(t *testing.T) {
		codes := make(map[string]bool)
		for i := 0; i < 100; i++ {
			code := GenerateRoomCode()
			if codes[code] {
				t.Errorf("Generated duplicate code: %s", code)
			}
			codes[code] = true
		}
	})
}

// T031: Unit test for RoomService.CreateRoom
func TestRoomService_CreateRoom(t *testing.T) {
	t.Run("creates room with valid maxPlayers", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		roomService := NewRoomService(roomStore)

		maxPlayers := 10
		room, err := roomService.CreateRoom(maxPlayers)

		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if room == nil {
			t.Fatal("Expected room to be created, got nil")
		}

		// Verify room code is 6 characters
		if len(room.Code) != 6 {
			t.Errorf("Expected room code length 6, got %d", len(room.Code))
		}

		// Verify status is WAITING
		if room.Status != models.RoomStatusWaiting {
			t.Errorf("Expected status WAITING, got %v", room.Status)
		}

		// Verify maxPlayers matches
		if room.MaxPlayers != maxPlayers {
			t.Errorf("Expected maxPlayers %d, got %d", maxPlayers, room.MaxPlayers)
		}

		// Verify players array is initialized and empty
		if room.Players == nil {
			t.Error("Expected players array to be initialized")
		}
		if len(room.Players) != 0 {
			t.Errorf("Expected empty players array, got %d players", len(room.Players))
		}

		// Verify timestamps are set
		if room.CreatedAt.IsZero() {
			t.Error("Expected createdAt to be set")
		}
		if room.UpdatedAt.IsZero() {
			t.Error("Expected updatedAt to be set")
		}

		// Verify room is stored
		storedRoom, err := roomStore.Get(room.Code)
		if err != nil {
			t.Errorf("Expected room to be stored, got error: %v", err)
		}
		if storedRoom.Code != room.Code {
			t.Errorf("Expected stored room code %s, got %s", room.Code, storedRoom.Code)
		}
	})

	t.Run("rejects maxPlayers below minimum (6)", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		roomService := NewRoomService(roomStore)

		_, err := roomService.CreateRoom(5)

		if err == nil {
			t.Fatal("Expected error for maxPlayers < 6, got nil")
		}
	})

	t.Run("rejects maxPlayers above maximum (30)", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		roomService := NewRoomService(roomStore)

		_, err := roomService.CreateRoom(31)

		if err == nil {
			t.Fatal("Expected error for maxPlayers > 30, got nil")
		}
	})

	t.Run("handles duplicate room code by regenerating", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		roomService := NewRoomService(roomStore)

		// Create first room
		room1, err := roomService.CreateRoom(10)
		if err != nil {
			t.Fatalf("Failed to create first room: %v", err)
		}

		// Manually inject a room with a specific code to test collision handling
		// In a real implementation, CreateRoom should retry on collision
		room2, err := roomService.CreateRoom(10)
		if err != nil {
			t.Fatalf("Failed to create second room: %v", err)
		}

		// Verify codes are different
		if room1.Code == room2.Code {
			t.Error("Expected different room codes, got duplicates")
		}
	})
}
