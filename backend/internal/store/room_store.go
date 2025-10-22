package store

import (
	"sync"
	"time"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
)

// RoomStore provides thread-safe in-memory storage for rooms
type RoomStore struct {
	rooms map[string]*models.Room
	mu    sync.RWMutex
}

// NewRoomStore creates a new RoomStore instance
func NewRoomStore() *RoomStore {
	return &RoomStore{
		rooms: make(map[string]*models.Room),
	}
}

// Create adds a new room to the store
func (s *RoomStore) Create(room *models.Room) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.rooms[room.Code]; exists {
		return models.ErrRoomCodeExists
	}

	s.rooms[room.Code] = room
	return nil
}

// Get retrieves a room by code
func (s *RoomStore) Get(code string) (*models.Room, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	room, exists := s.rooms[code]
	if !exists {
		return nil, models.ErrRoomNotFound
	}

	return room, nil
}

// Update modifies an existing room
func (s *RoomStore) Update(room *models.Room) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.rooms[room.Code]; !exists {
		return models.ErrRoomNotFound
	}

	room.UpdatedAt = time.Now()
	s.rooms[room.Code] = room
	return nil
}

// Delete removes a room from the store
func (s *RoomStore) Delete(code string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.rooms, code)
	return nil
}
