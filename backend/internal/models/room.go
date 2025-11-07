package models

import "time"

// RoomStatus represents the room state
type RoomStatus string

const (
	RoomStatusWaiting    RoomStatus = "WAITING"     // Lobby state
	RoomStatusInProgress RoomStatus = "IN_PROGRESS" // Game in progress
)

// Room represents a game session lobby
type Room struct {
	Code         string       `json:"code"`                   // 6-character unique code
	Status       RoomStatus   `json:"status"`                 // Current status
	Players      []*Player    `json:"players"`                // List of participants
	MaxPlayers   int          `json:"maxPlayers"`             // Maximum capacity (6-30)
	GameSession  *GameSession `json:"gameSession"`            // Game state (nil in lobby)
	IsPublic     bool         `json:"isPublic"`               // Room visibility (public/private)
	RoleConfigID string       `json:"roleConfigId,omitempty"` // Role configuration ID (default: "standard")
	HostNickname string       `json:"hostNickname,omitempty"` // Host's display name (optional)
	CreatedAt    time.Time    `json:"createdAt"`              // Creation timestamp
	UpdatedAt    time.Time    `json:"updatedAt"`              // Last update timestamp
}
