package models

import "time"

// TeamColor represents the team affiliation
type TeamColor string

const (
	TeamRed  TeamColor = "RED"
	TeamBlue TeamColor = "BLUE"
)

// RoomColor represents the physical room assignment
type RoomColor string

const (
	RedRoom  RoomColor = "RED_ROOM"
	BlueRoom RoomColor = "BLUE_ROOM"
)

// Player represents a game participant
type Player struct {
	ID          string     `json:"id"`          // UUID
	Nickname    string     `json:"nickname"`    // 2-20 characters
	IsAnonymous bool       `json:"isAnonymous"` // Auto-generated nickname flag
	RoomCode    string     `json:"roomCode"`    // Room code player belongs to
	IsOwner     bool       `json:"isOwner"`     // Room owner flag
	Role        *Role      `json:"role"`        // Assigned role (nil before game start)
	Team        TeamColor  `json:"team"`        // RED or BLUE (empty before game start)
	CurrentRoom RoomColor  `json:"currentRoom"` // RED_ROOM or BLUE_ROOM (empty before game start)
	ConnectedAt time.Time  `json:"connectedAt"` // Join timestamp
}
