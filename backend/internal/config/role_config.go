package config

import (
	"encoding/json"
	"fmt"
)

// RoleType represents the category of a role
type RoleType string

const (
	RoleTypeLeader    RoleType = "leader"    // President, Bomber
	RoleTypeSpy       RoleType = "spy"       // Spies
	RoleTypeOperative RoleType = "operative" // Regular team members
	RoleTypeGrey      RoleType = "grey"      // Independent roles
	RoleTypeSpecial   RoleType = "special"   // Special abilities
)

// TeamColor represents which team a role belongs to
type TeamColor string

const (
	TeamRed  TeamColor = "RED"
	TeamBlue TeamColor = "BLUE"
	TeamGrey TeamColor = "GREY" // Neutral/Independent
)

// RoleConfig represents the root configuration structure
type RoleConfig struct {
	ID            string           `json:"id"`
	Name          string           `json:"name"`
	NameKo        string           `json:"nameKo"`
	Description   string           `json:"description"`
	DescriptionKo string           `json:"descriptionKo"`
	Version       string           `json:"version"`
	Roles         []RoleDefinition `json:"roles"`
}

// RoleDefinition defines a single role in the game
type RoleDefinition struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	NameKo        string    `json:"nameKo"`
	Team          TeamColor `json:"team"`
	Type          RoleType  `json:"type"`
	Description   string    `json:"description"`
	DescriptionKo string    `json:"descriptionKo"`
	Count         RoleCount `json:"count"`
	MinPlayers    int       `json:"minPlayers"`
	Priority      int       `json:"priority"`
	Color         string    `json:"color,omitempty"`
	Icon          string    `json:"icon,omitempty"`
}

// RoleCount can be a fixed number or a map of player ranges
type RoleCount struct {
	Fixed  *int           `json:"-"`
	Ranges map[string]int `json:"-"`
}

// UnmarshalJSON handles both int and object formats for RoleCount
// Examples:
//   - Fixed count: "count": 1
//   - Range-based: "count": {"6-9": 1, "10+": 2}
func (rc *RoleCount) UnmarshalJSON(data []byte) error {
	// Try to unmarshal as int first (fixed count)
	var fixed int
	if err := json.Unmarshal(data, &fixed); err == nil {
		rc.Fixed = &fixed
		return nil
	}

	// Try to unmarshal as object (range-based count)
	var ranges map[string]int
	if err := json.Unmarshal(data, &ranges); err != nil {
		return fmt.Errorf("invalid count format: must be int or map[string]int")
	}

	rc.Ranges = ranges
	return nil
}

// MarshalJSON converts RoleCount back to JSON
func (rc RoleCount) MarshalJSON() ([]byte, error) {
	if rc.Fixed != nil {
		return json.Marshal(*rc.Fixed)
	}
	if rc.Ranges != nil {
		return json.Marshal(rc.Ranges)
	}
	return json.Marshal(0)
}

// GetCount returns the role count for a given number of players
func (rc *RoleCount) GetCount(playerCount int) int {
	// If fixed count, return it
	if rc.Fixed != nil {
		return *rc.Fixed
	}

	// If range-based, find matching range
	if rc.Ranges != nil {
		// Check for exact match first
		if count, ok := rc.Ranges[fmt.Sprintf("%d", playerCount)]; ok {
			return count
		}

		// Check for range patterns (e.g., "6-9", "10+")
		for rangeKey, count := range rc.Ranges {
			if matchesRange(playerCount, rangeKey) {
				return count
			}
		}
	}

	return 0
}

// matchesRange checks if a player count matches a range pattern
// Supported patterns:
//   - "6-9": players between 6 and 9 (inclusive)
//   - "10+": players 10 or more
//   - "6": exactly 6 players
func matchesRange(playerCount int, rangePattern string) bool {
	// Check for "N+" pattern (e.g., "10+")
	var minPlus int
	if n, err := fmt.Sscanf(rangePattern, "%d+", &minPlus); n == 1 && err == nil {
		return playerCount >= minPlus
	}

	// Check for "N-M" pattern (e.g., "6-9")
	var min, max int
	if n, err := fmt.Sscanf(rangePattern, "%d-%d", &min, &max); n == 2 && err == nil {
		return playerCount >= min && playerCount <= max
	}

	// Check for exact match "N" (e.g., "6")
	var exact int
	if n, err := fmt.Sscanf(rangePattern, "%d", &exact); n == 1 && err == nil {
		return playerCount == exact
	}

	return false
}

// RoleConfigMeta contains metadata about a role configuration
// Used for listing available configurations without loading full details
type RoleConfigMeta struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	NameKo        string `json:"nameKo"`
	Description   string `json:"description"`
	DescriptionKo string `json:"descriptionKo"`
	Version       string `json:"version"`
}

// ToMeta converts a RoleConfig to RoleConfigMeta
func (rc *RoleConfig) ToMeta() RoleConfigMeta {
	return RoleConfigMeta{
		ID:            rc.ID,
		Name:          rc.Name,
		NameKo:        rc.NameKo,
		Description:   rc.Description,
		DescriptionKo: rc.DescriptionKo,
		Version:       rc.Version,
	}
}
