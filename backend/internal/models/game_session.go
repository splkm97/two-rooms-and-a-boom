package models

import "time"

// GameSession represents active game state
type GameSession struct {
	ID              string    `json:"id"`              // Session ID
	RoomCode        string    `json:"roomCode"`        // Associated room
	RedTeam         []*Player `json:"redTeam"`         // Red team members
	BlueTeam        []*Player `json:"blueTeam"`        // Blue team members
	RedRoomPlayers  []*Player `json:"redRoomPlayers"`  // Players in red room
	BlueRoomPlayers []*Player `json:"blueRoomPlayers"` // Players in blue room
	StartedAt       time.Time `json:"startedAt"`       // Game start time
}

// Role represents a player's assigned role
type Role struct {
	ID          string    `json:"id"`          // Role identifier
	Name        string    `json:"name"`        // Korean display name
	Description string    `json:"description"` // Role description
	Team        TeamColor `json:"team"`        // Team affiliation
	IsSpy       bool      `json:"isSpy"`       // Spy flag
	IsLeader    bool      `json:"isLeader"`    // Leader flag (President/Bomber)
}

// Predefined roles
var (
	RolePresident = Role{
		ID:          "PRESIDENT",
		Name:        "대통령",
		Description: "블루 팀의 리더. 블루 팀이 승리하려면 폭파범과 다른 방에 있어야 합니다.",
		Team:        TeamBlue,
		IsSpy:       false,
		IsLeader:    true,
	}

	RoleBomber = Role{
		ID:          "BOMBER",
		Name:        "폭파범",
		Description: "레드 팀의 리더. 레드 팀이 승리하려면 대통령과 같은 방에 있어야 합니다.",
		Team:        TeamRed,
		IsSpy:       false,
		IsLeader:    true,
	}

	RoleRedSpy = Role{
		ID:          "RED_SPY",
		Name:        "레드 팀 스파이",
		Description: "레드 팀 소속. 진영 정보 교환 시 블루 팀으로 보이며, 전체 정보 교환 시 스파이 신분이 공개됩니다.",
		Team:        TeamRed,
		IsSpy:       true,
		IsLeader:    false,
	}

	RoleBlueSpy = Role{
		ID:          "BLUE_SPY",
		Name:        "블루 팀 스파이",
		Description: "블루 팀 소속. 진영 정보 교환 시 레드 팀으로 보이며, 전체 정보 교환 시 스파이 신분이 공개됩니다.",
		Team:        TeamBlue,
		IsSpy:       true,
		IsLeader:    false,
	}

	RoleRedOperative = Role{
		ID:          "RED_OPERATIVE",
		Name:        "레드 팀 요원",
		Description: "레드 팀의 일반 시민.",
		Team:        TeamRed,
		IsSpy:       false,
		IsLeader:    false,
	}

	RoleBlueOperative = Role{
		ID:          "BLUE_OPERATIVE",
		Name:        "블루 팀 요원",
		Description: "블루 팀의 일반 시민.",
		Team:        TeamBlue,
		IsSpy:       false,
		IsLeader:    false,
	}
)
