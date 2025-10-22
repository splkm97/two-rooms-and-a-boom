package services

import (
	"errors"
	"math/rand"
	"time"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
)

const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

var seededRand *rand.Rand = rand.New(rand.NewSource(time.Now().UnixNano()))

// GenerateRoomCode generates a unique 6-character alphanumeric code
func GenerateRoomCode() string {
	code := make([]byte, 6)
	for i := range code {
		code[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(code)
}

// RoomService handles room-related business logic
type RoomService struct {
	roomStore *store.RoomStore
}

// NewRoomService creates a new RoomService instance
func NewRoomService(roomStore *store.RoomStore) *RoomService {
	return &RoomService{
		roomStore: roomStore,
	}
}

// T035: Implement RoomService.CreateRoom
func (s *RoomService) CreateRoom(maxPlayers int) (*models.Room, error) {
	// Validate maxPlayers range (6-30)
	if maxPlayers < 6 || maxPlayers > 30 {
		return nil, errors.New("maxPlayers must be between 6 and 30")
	}

	// Generate unique room code with retry logic
	var roomCode string
	maxRetries := 10
	for i := 0; i < maxRetries; i++ {
		roomCode = GenerateRoomCode()
		// Check if code already exists
		_, err := s.roomStore.Get(roomCode)
		if err == models.ErrRoomNotFound {
			// Code is unique, break
			break
		}
		// Code exists, retry
		if i == maxRetries-1 {
			return nil, errors.New("failed to generate unique room code")
		}
	}

	// Create room
	now := time.Now()
	room := &models.Room{
		Code:       roomCode,
		Status:     models.RoomStatusWaiting,
		Players:    []*models.Player{},
		MaxPlayers: maxPlayers,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	// Store room
	if err := s.roomStore.Create(room); err != nil {
		return nil, err
	}

	return room, nil
}

// GetRoom retrieves a room by code
func (s *RoomService) GetRoom(roomCode string) (*models.Room, error) {
	return s.roomStore.Get(roomCode)
}
