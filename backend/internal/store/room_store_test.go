package store

import (
	"testing"
	"time"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
)

func TestRoomStore_Create(t *testing.T) {
	store := NewRoomStore()
	room := &models.Room{
		Code:       "ABC123",
		Status:     models.RoomStatusWaiting,
		MaxPlayers: 10,
		Players:    []*models.Player{},
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	err := store.Create(room)
	if err != nil {
		t.Fatalf("Failed to create room: %v", err)
	}

	// Verify room exists
	retrieved, err := store.Get("ABC123")
	if err != nil {
		t.Fatalf("Failed to retrieve room: %v", err)
	}
	if retrieved.Code != "ABC123" {
		t.Errorf("Expected code ABC123, got %s", retrieved.Code)
	}
}

func TestRoomStore_CreateDuplicate(t *testing.T) {
	store := NewRoomStore()
	room := &models.Room{
		Code:       "XYZ789",
		Status:     models.RoomStatusWaiting,
		MaxPlayers: 10,
		Players:    []*models.Player{},
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	store.Create(room)
	err := store.Create(room)
	if err != models.ErrRoomCodeExists {
		t.Errorf("Expected ErrRoomCodeExists, got %v", err)
	}
}

func TestRoomStore_Get(t *testing.T) {
	store := NewRoomStore()

	_, err := store.Get("NONEXISTENT")
	if err != models.ErrRoomNotFound {
		t.Errorf("Expected ErrRoomNotFound, got %v", err)
	}
}

func TestRoomStore_Update(t *testing.T) {
	store := NewRoomStore()
	room := &models.Room{
		Code:       "UPD123",
		Status:     models.RoomStatusWaiting,
		MaxPlayers: 10,
		Players:    []*models.Player{},
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	store.Create(room)
	room.Status = models.RoomStatusInProgress
	err := store.Update(room)
	if err != nil {
		t.Fatalf("Failed to update room: %v", err)
	}

	retrieved, _ := store.Get("UPD123")
	if retrieved.Status != models.RoomStatusInProgress {
		t.Errorf("Expected status IN_PROGRESS, got %s", retrieved.Status)
	}
}

func TestRoomStore_Delete(t *testing.T) {
	store := NewRoomStore()
	room := &models.Room{
		Code:       "DEL123",
		Status:     models.RoomStatusWaiting,
		MaxPlayers: 10,
		Players:    []*models.Player{},
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	store.Create(room)
	err := store.Delete("DEL123")
	if err != nil {
		t.Fatalf("Failed to delete room: %v", err)
	}

	_, err = store.Get("DEL123")
	if err != models.ErrRoomNotFound {
		t.Errorf("Expected ErrRoomNotFound after delete, got %v", err)
	}
}
