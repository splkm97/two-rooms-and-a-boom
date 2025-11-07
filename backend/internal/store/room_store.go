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

// ListPublicRooms retrieves all public rooms with optional filtering and pagination
func (s *RoomStore) ListPublicRooms(status string, limit int, offset int) ([]*models.Room, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Collect all public rooms
	var publicRooms []*models.Room
	for _, room := range s.rooms {
		// Filter by public visibility
		if !room.IsPublic {
			continue
		}

		// Filter by status if provided
		if status != "" && string(room.Status) != status {
			continue
		}

		publicRooms = append(publicRooms, room)
	}

	// Sort by CreatedAt descending (newest first)
	for i := 0; i < len(publicRooms)-1; i++ {
		for j := i + 1; j < len(publicRooms); j++ {
			if publicRooms[i].CreatedAt.Before(publicRooms[j].CreatedAt) {
				publicRooms[i], publicRooms[j] = publicRooms[j], publicRooms[i]
			}
		}
	}

	total := len(publicRooms)

	// Apply pagination
	start := offset
	if start > total {
		start = total
	}

	end := offset + limit
	if end > total {
		end = total
	}

	if start >= total {
		return []*models.Room{}, total, nil
	}

	return publicRooms[start:end], total, nil
}

// UpdateRoomVisibility updates the visibility setting of a room
func (s *RoomStore) UpdateRoomVisibility(roomCode string, isPublic bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	room, exists := s.rooms[roomCode]
	if !exists {
		return models.ErrRoomNotFound
	}

	room.IsPublic = isPublic
	room.UpdatedAt = time.Now()

	return nil
}
