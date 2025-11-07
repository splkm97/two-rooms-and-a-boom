package config

import (
	"errors"
	"fmt"
)

// validateRoleConfig performs comprehensive validation on a role configuration
func validateRoleConfig(config *RoleConfig) error {
	var errs []error

	// Metadata validation
	if config.ID == "" {
		errs = append(errs, errors.New("configuration ID is required"))
	}
	if config.Name == "" {
		errs = append(errs, errors.New("configuration name is required"))
	}
	if config.Version == "" {
		errs = append(errs, errors.New("version is required"))
	}

	// Role validation
	if len(config.Roles) == 0 {
		errs = append(errs, errors.New("at least one role must be defined"))
	}

	seenIDs := make(map[string]bool)
	hasRed, hasBlue := false, false
	teamPriorities := make(map[TeamColor]map[int]bool)
	teamPriorities[TeamRed] = make(map[int]bool)
	teamPriorities[TeamBlue] = make(map[int]bool)

	for i, role := range config.Roles {
		// Duplicate ID check
		if seenIDs[role.ID] {
			errs = append(errs, fmt.Errorf("duplicate role ID '%s' at index %d", role.ID, i))
		}
		seenIDs[role.ID] = true

		// Required fields
		if role.Name == "" {
			errs = append(errs, fmt.Errorf("role at index %d missing name", i))
		}

		// Team validation
		if role.Team != TeamRed && role.Team != TeamBlue && role.Team != TeamGrey {
			errs = append(errs, fmt.Errorf("invalid team '%s' for role '%s'", role.Team, role.ID))
		}

		// Track team coverage
		if role.Team == TeamRed {
			hasRed = true
		}
		if role.Team == TeamBlue {
			hasBlue = true
		}

		// MinPlayers validation
		if role.MinPlayers < 6 {
			errs = append(errs, fmt.Errorf("minPlayers must be >= 6 for role '%s'", role.ID))
		}

		// Count validation
		if role.Count.Fixed != nil && *role.Count.Fixed < 0 {
			errs = append(errs, fmt.Errorf("count must be >= 0 for role '%s'", role.ID))
		}

		// Type validation
		validTypes := map[RoleType]bool{
			RoleTypeLeader:    true,
			RoleTypeSpy:       true,
			RoleTypeOperative: true,
			RoleTypeGrey:      true,
			RoleTypeSpecial:   true,
		}
		if !validTypes[role.Type] {
			errs = append(errs, fmt.Errorf("invalid type '%s' for role '%s'", role.Type, role.ID))
		}

		// Priority uniqueness per team (only for RED and BLUE teams)
		if role.Team == TeamRed || role.Team == TeamBlue {
			if teamPriorities[role.Team][role.Priority] {
				errs = append(errs, fmt.Errorf("duplicate priority %d for %s team", role.Priority, role.Team))
			}
			teamPriorities[role.Team][role.Priority] = true
		}
	}

	// Team coverage check - must have both RED and BLUE leaders
	if !hasRed {
		errs = append(errs, errors.New("configuration must define roles for RED team"))
	}
	if !hasBlue {
		errs = append(errs, errors.New("configuration must define roles for BLUE team"))
	}

	// Verify each team has a leader
	hasRedLeader, hasBlueLeader := false, false
	for _, role := range config.Roles {
		if role.Team == TeamRed && role.Type == RoleTypeLeader {
			hasRedLeader = true
		}
		if role.Team == TeamBlue && role.Type == RoleTypeLeader {
			hasBlueLeader = true
		}
	}

	if !hasRedLeader {
		errs = append(errs, errors.New("configuration must define a RED team leader"))
	}
	if !hasBlueLeader {
		errs = append(errs, errors.New("configuration must define a BLUE team leader"))
	}

	// Combine errors
	if len(errs) > 0 {
		return fmt.Errorf("validation errors: %v", errs)
	}

	return nil
}
