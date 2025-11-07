package services

import (
	"errors"
	"log"
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
func (s *RoomService) CreateRoom(maxPlayers int, isPublic bool, roleConfigID string, selectedRoles map[string]int) (*models.Room, error) {
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

	// Default to "standard" if roleConfigID is empty
	if roleConfigID == "" {
		roleConfigID = "standard"
	}

	// Create room
	now := time.Now()
	room := &models.Room{
		Code:          roomCode,
		Status:        models.RoomStatusWaiting,
		Players:       []*models.Player{},
		MaxPlayers:    maxPlayers,
		IsPublic:      isPublic,
		RoleConfigID:  roleConfigID,
		SelectedRoles: selectedRoles,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// Store room
	if err := s.roomStore.Create(room); err != nil {
		log.Printf("[ERROR] Failed to create room: %v", err)
		return nil, err
	}

	// T103: Log critical operation
	log.Printf("[INFO] Room created: code=%s maxPlayers=%d isPublic=%v roleConfig=%s selectedRolesCount=%d", room.Code, room.MaxPlayers, room.IsPublic, room.RoleConfigID, len(room.SelectedRoles))

	return room, nil
}

// GetRoom retrieves a room by code
func (s *RoomService) GetRoom(roomCode string) (*models.Room, error) {
	return s.roomStore.Get(roomCode)
}

// T099: TransferOwnership transfers room ownership to the next player when the owner leaves (FR-017)
func (s *RoomService) TransferOwnership(roomCode string, oldOwnerID string) (*models.Player, error) {
	room, err := s.roomStore.Get(roomCode)
	if err != nil {
		return nil, err
	}

	// Find the next player to become owner (first player that is not the old owner)
	var newOwner *models.Player
	for _, player := range room.Players {
		if player.ID != oldOwnerID {
			newOwner = player
			break
		}
	}

	if newOwner == nil {
		return nil, errors.New("no other players available to transfer ownership")
	}

	// Update ownership flags
	for _, player := range room.Players {
		if player.ID == newOwner.ID {
			player.IsOwner = true
		} else {
			player.IsOwner = false
		}
	}

	room.UpdatedAt = time.Now()

	// Save updated room
	if err := s.roomStore.Update(room); err != nil {
		log.Printf("[ERROR] Failed to transfer ownership: %v", err)
		return nil, err
	}

	// T103: Log critical operation
	log.Printf("[INFO] Ownership transferred: room=%s oldOwner=%s newOwner=%s", roomCode, oldOwnerID, newOwner.ID)

	return newOwner, nil
}

// RoomListResponse represents the response structure for listing public rooms
type RoomListResponse struct {
	Rooms  []*models.Room `json:"rooms"`
	Total  int            `json:"total"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

// GetPublicRooms retrieves a list of public rooms with filtering and pagination
func (s *RoomService) GetPublicRooms(status string, limit int, offset int) (*RoomListResponse, error) {
	// Validate and set defaults
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	// Validate status filter
	if status != "" && status != string(models.RoomStatusWaiting) && status != string(models.RoomStatusInProgress) {
		return nil, errors.New("invalid status filter: must be WAITING or IN_PROGRESS")
	}

	// Fetch public rooms from store
	rooms, total, err := s.roomStore.ListPublicRooms(status, limit, offset)
	if err != nil {
		log.Printf("[ERROR] Failed to list public rooms: %v", err)
		return nil, err
	}

	// Build response
	response := &RoomListResponse{
		Rooms:  rooms,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}

	log.Printf("[INFO] Listed public rooms: total=%d returned=%d status=%s", total, len(rooms), status)

	return response, nil
}

// UpdateRoomVisibility updates the visibility setting of a room
func (s *RoomService) UpdateRoomVisibility(roomCode string, playerID string, isPublic bool) (*models.Room, error) {
	// Get the room
	room, err := s.roomStore.Get(roomCode)
	if err != nil {
		return nil, err
	}

	// Verify the player is the room owner
	var isOwner bool
	for _, player := range room.Players {
		if player.ID == playerID && player.IsOwner {
			isOwner = true
			break
		}
	}

	if !isOwner {
		return nil, errors.New("only the room owner can change visibility")
	}

	// Update visibility
	if err := s.roomStore.UpdateRoomVisibility(roomCode, isPublic); err != nil {
		log.Printf("[ERROR] Failed to update room visibility: %v", err)
		return nil, err
	}

	// Get updated room
	updatedRoom, err := s.roomStore.Get(roomCode)
	if err != nil {
		return nil, err
	}

	log.Printf("[INFO] Room visibility updated: code=%s isPublic=%v", roomCode, isPublic)

	return updatedRoom, nil
}
