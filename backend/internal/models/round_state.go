package models

import "time"

// RoundStatus represents the status of a round
type RoundStatus string

const (
	RoundStatusSetup      RoundStatus = "SETUP"      // Leaders being assigned
	RoundStatusActive     RoundStatus = "ACTIVE"     // Timer running, players strategizing
	RoundStatusSelecting  RoundStatus = "SELECTING"  // Leaders selecting hostages
	RoundStatusExchanging RoundStatus = "EXCHANGING" // Executing hostage exchange
	RoundStatusComplete   RoundStatus = "COMPLETE"   // Round finished
)

// Round durations in seconds
const (
	Round1Duration = 180 // 3 minutes
	Round2Duration = 120 // 2 minutes
	Round3Duration = 60  // 1 minute
)

// RoundState represents the state of a single round
type RoundState struct {
	GameSessionID string      `json:"gameSessionId"` // Associated game session
	RoundNumber   int         `json:"roundNumber"`   // 1, 2, or 3
	Duration      int         `json:"duration"`      // Total seconds (180/120/60)
	TimeRemaining int         `json:"timeRemaining"` // Seconds left
	Status        RoundStatus `json:"status"`        // Current round status
	RedLeaderID   string      `json:"redLeaderId"`   // Red room leader
	BlueLeaderID  string      `json:"blueLeaderId"`  // Blue room leader
	HostageCount  int         `json:"hostageCount"`  // Number of hostages per room
	RedHostages   []string    `json:"redHostages"`   // Red room hostage player IDs
	BlueHostages  []string    `json:"blueHostages"`  // Blue room hostage player IDs
	StartedAt     time.Time   `json:"startedAt"`     // Round start time
	EndedAt       *time.Time  `json:"endedAt,omitempty"` // Round end time
}

// GetRoundDuration returns the duration for a given round number
func GetRoundDuration(roundNumber int) int {
	switch roundNumber {
	case 1:
		return Round1Duration
	case 2:
		return Round2Duration
	case 3:
		return Round3Duration
	default:
		return Round1Duration
	}
}

// GetHostageCount calculates the number of hostages based on player count and round
// Per Two Rooms and a Boom official rules:
// - 6-10 players: 1 hostage per round
// - 11-21 players: Round 1: 2, Round 2: 1, Round 3: 1
// - 22-30 players: Round 1: 3, Round 2: 2, Round 3: 1
func GetHostageCount(playerCount, roundNumber int) int {
	if playerCount <= 10 {
		return 1
	} else if playerCount <= 21 {
		if roundNumber == 1 {
			return 2
		}
		return 1
	} else {
		// 22-30 players
		switch roundNumber {
		case 1:
			return 3
		case 2:
			return 2
		case 3:
			return 1
		default:
			return 1
		}
	}
}
