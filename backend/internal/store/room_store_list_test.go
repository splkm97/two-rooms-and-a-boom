package store

import (
	"testing"
	"time"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
)

func TestRoomStore_ListPublicRooms(t *testing.T) {
	store := NewRoomStore()
	now := time.Now()

	// Create test rooms
	publicRoom1 := &models.Room{
		Code:       "PUB001",
		Status:     models.RoomStatusWaiting,
		IsPublic:   true,
		MaxPlayers: 10,
		Players:    []*models.Player{},
		CreatedAt:  now.Add(-10 * time.Minute),
		UpdatedAt:  now.Add(-10 * time.Minute),
	}

	publicRoom2 := &models.Room{
		Code:       "PUB002",
		Status:     models.RoomStatusInProgress,
		IsPublic:   true,
		MaxPlayers: 10,
		Players:    []*models.Player{},
		CreatedAt:  now.Add(-5 * time.Minute),
		UpdatedAt:  now.Add(-5 * time.Minute),
	}

	publicRoom3 := &models.Room{
		Code:       "PUB003",
		Status:     models.RoomStatusWaiting,
		IsPublic:   true,
		MaxPlayers: 10,
		Players:    []*models.Player{},
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	privateRoom := &models.Room{
		Code:       "PRIV01",
		Status:     models.RoomStatusWaiting,
		IsPublic:   false,
		MaxPlayers: 10,
		Players:    []*models.Player{},
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	// Add rooms to store
	store.Create(publicRoom1)
	store.Create(publicRoom2)
	store.Create(publicRoom3)
	store.Create(privateRoom)

	t.Run("List all public rooms", func(t *testing.T) {
		rooms, total, err := store.ListPublicRooms("", 10, 0)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if total != 3 {
			t.Errorf("Expected total=3, got %d", total)
		}

		if len(rooms) != 3 {
			t.Errorf("Expected 3 rooms, got %d", len(rooms))
		}

		// Verify private room is not included
		for _, room := range rooms {
			if room.Code == "PRIV01" {
				t.Error("Private room should not be in public list")
			}
		}

		// Verify newest first (sorted by CreatedAt DESC)
		if rooms[0].Code != "PUB003" {
			t.Errorf("Expected newest room first, got %s", rooms[0].Code)
		}
	})

	t.Run("Filter by WAITING status", func(t *testing.T) {
		rooms, total, err := store.ListPublicRooms("WAITING", 10, 0)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if total != 2 {
			t.Errorf("Expected total=2, got %d", total)
		}

		if len(rooms) != 2 {
			t.Errorf("Expected 2 rooms, got %d", len(rooms))
		}

		// Verify all are WAITING
		for _, room := range rooms {
			if room.Status != models.RoomStatusWaiting {
				t.Errorf("Expected WAITING status, got %s", room.Status)
			}
		}
	})

	t.Run("Filter by IN_PROGRESS status", func(t *testing.T) {
		rooms, total, err := store.ListPublicRooms("IN_PROGRESS", 10, 0)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if total != 1 {
			t.Errorf("Expected total=1, got %d", total)
		}

		if len(rooms) != 1 {
			t.Errorf("Expected 1 room, got %d", len(rooms))
		}

		if rooms[0].Status != models.RoomStatusInProgress {
			t.Errorf("Expected IN_PROGRESS status, got %s", rooms[0].Status)
		}
	})

	t.Run("Pagination - first page", func(t *testing.T) {
		rooms, total, err := store.ListPublicRooms("", 2, 0)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if total != 3 {
			t.Errorf("Expected total=3, got %d", total)
		}

		if len(rooms) != 2 {
			t.Errorf("Expected 2 rooms (page size), got %d", len(rooms))
		}
	})

	t.Run("Pagination - second page", func(t *testing.T) {
		rooms, total, err := store.ListPublicRooms("", 2, 2)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if total != 3 {
			t.Errorf("Expected total=3, got %d", total)
		}

		if len(rooms) != 1 {
			t.Errorf("Expected 1 room (remaining), got %d", len(rooms))
		}
	})

	t.Run("Pagination - offset beyond total", func(t *testing.T) {
		rooms, total, err := store.ListPublicRooms("", 10, 10)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if total != 3 {
			t.Errorf("Expected total=3, got %d", total)
		}

		if len(rooms) != 0 {
			t.Errorf("Expected 0 rooms, got %d", len(rooms))
		}
	})

	t.Run("Empty result when no public rooms", func(t *testing.T) {
		emptyStore := NewRoomStore()
		privateOnly := &models.Room{
			Code:       "PRIV02",
			Status:     models.RoomStatusWaiting,
			IsPublic:   false,
			MaxPlayers: 10,
			Players:    []*models.Player{},
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		emptyStore.Create(privateOnly)

		rooms, total, err := emptyStore.ListPublicRooms("", 10, 0)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if total != 0 {
			t.Errorf("Expected total=0, got %d", total)
		}

		if len(rooms) != 0 {
			t.Errorf("Expected 0 rooms, got %d", len(rooms))
		}
	})
}

func TestRoomStore_UpdateRoomVisibility(t *testing.T) {
	store := NewRoomStore()
	now := time.Now()

	room := &models.Room{
		Code:       "TEST01",
		Status:     models.RoomStatusWaiting,
		IsPublic:   true,
		MaxPlayers: 10,
		Players:    []*models.Player{},
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	store.Create(room)

	t.Run("Update public to private", func(t *testing.T) {
		err := store.UpdateRoomVisibility("TEST01", false)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		updatedRoom, _ := store.Get("TEST01")
		if updatedRoom.IsPublic {
			t.Error("Expected room to be private")
		}

		// Verify UpdatedAt changed
		if !updatedRoom.UpdatedAt.After(now) {
			t.Error("Expected UpdatedAt to be updated")
		}
	})

	t.Run("Update private to public", func(t *testing.T) {
		err := store.UpdateRoomVisibility("TEST01", true)
		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		updatedRoom, _ := store.Get("TEST01")
		if !updatedRoom.IsPublic {
			t.Error("Expected room to be public")
		}
	})

	t.Run("Update non-existent room", func(t *testing.T) {
		err := store.UpdateRoomVisibility("NOTFOUND", true)
		if err != models.ErrRoomNotFound {
			t.Errorf("Expected ErrRoomNotFound, got %v", err)
		}
	})
}
