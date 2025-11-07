# Feature Specification: Custom Role System

## Overview

**Feature ID**: 003
**Feature Name**: Custom Role System
**Status**: Planning
**Priority**: High
**Created**: 2025-11-07

## Summary

Implement a flexible, configuration-driven role system that allows game operators to define custom roles via JSON configuration files. The system will replace the current hardcoded role assignment logic with a dynamic loader that reads role definitions at server startup. Room hosts can choose from available role configurations when creating a game, enabling different game modes and role distributions without code changes.

## Problem Statement

### Current Issues

1. **Hardcoded Roles**: Role assignment logic is hardcoded in `game_service.go:72-142`
2. **Inflexible**: Cannot add new roles without modifying and redeploying code
3. **Limited Variety**: Only supports 6 predefined roles (President, Bomber, 2 types of Spies, 2 types of Operatives)
4. **No Customization**: Game operators cannot tailor roles to their specific gameplay needs
5. **Maintenance Burden**: Every role change requires code update, testing, and deployment

### User Pain Points

- "I want to add a Doctor role but have to modify the code"
- "Cannot experiment with new role types without developer help"
- "Want to run special game modes with different role distributions"
- "Need to adjust role counts based on player feedback"
- "As a host, I want to choose different game modes (standard, extended, custom) when creating a room"

## Goals

### Primary Goals

1. **Configuration-Based Roles**: Define all roles in external JSON configuration files
2. **Server Startup Loading**: Load and validate role configurations when server starts
3. **Backward Compatibility**: Support existing role types while allowing new ones
4. **Dynamic Assignment**: Calculate role distribution based on player count at runtime
5. **Validation**: Ensure role configurations are valid and consistent

### Secondary Goals

1. **Multiple Role Sets**: Support different role configurations for different game modes
2. **Host Selection**: Room hosts can choose which role configuration to use
3. **Role Metadata**: Include descriptions, icons, and display information
4. **Advanced Roles**: Support complex role types (neutral, conditional, etc.)

### Non-Goals (Out of Scope)

- Real-time role editing via admin UI (future feature)
- Hot reload of role configurations without server restart
- Role marketplace or sharing system
- Role balancing algorithms
- Player-level role customization (only host chooses)

## User Stories

### As a Game Operator

```
As a game operator,
I want to define custom roles in a configuration file,
So that I can customize the game without modifying code.
```

**Acceptance Criteria**:
- [ ] I can create a JSON file with role definitions
- [ ] Server loads roles automatically at startup
- [ ] Invalid configurations are rejected with clear error messages
- [ ] I can see which roles are active in server logs
- [ ] Changes take effect after server restart

### As a Game Designer

```
As a game designer,
I want to create new role types with different team alignments,
So that I can experiment with gameplay variations.
```

**Acceptance Criteria**:
- [ ] I can define roles for RED, BLUE, and GREY (neutral) teams
- [ ] I can specify role counts based on player thresholds
- [ ] I can set minimum player counts for role activation
- [ ] I can include role descriptions and metadata
- [ ] Roles are assigned correctly based on my configuration

### As a Room Host

```
As a room host,
I want to choose which role configuration to use when creating a room,
So that I can customize the game experience for my players.
```

**Acceptance Criteria**:
- [ ] I can see a list of available role configurations when creating a room
- [ ] I can select a configuration (e.g., "Standard", "Extended", "Custom")
- [ ] The selected configuration is displayed to players in the lobby
- [ ] Role assignment uses my selected configuration when game starts
- [ ] Players can see which role set is being used

### As a Developer

```
As a developer,
I want a clear role configuration schema,
So that I can validate and test role definitions programmatically.
```

**Acceptance Criteria**:
- [ ] JSON schema is documented and versioned
- [ ] Validation errors include line numbers and specific issues
- [ ] Role loader has comprehensive unit tests
- [ ] Example configurations are provided
- [ ] Migration path from hardcoded roles is clear

## Feature Requirements

### Functional Requirements

#### FR-1: Multiple Role Configuration Sets

**Description**: Support multiple named role configuration files

**Requirements**:
- Server loads all JSON files from `backend/config/roles/` directory
- Each file represents a game mode (e.g., `standard.json`, `extended.json`, `custom.json`)
- Each configuration has a unique ID and display name
- GET `/api/v1/role-configs` endpoint lists available configurations
- Default configuration used if not specified

**Example Directory Structure**:
```
backend/config/roles/
├── standard.json       # Default configuration
├── extended.json       # With Doctor, Engineer, Gambler
└── experimental.json   # Custom roles for testing
```

**Priority**: P0 (Must Have)

#### FR-2: Role Configuration Format

**Description**: JSON-based role definition format for each configuration set

**Requirements**:
- Support configuration metadata (id, name, description)
- Support role ID, name, team, type, description
- Allow player count-based role quantities
- Support minimum player thresholds
- Include display metadata (colors, icons, sort order)
- Version the configuration schema

**Example**:
```json
{
  "id": "standard",
  "name": "Standard Game",
  "nameKo": "기본 게임",
  "description": "Standard Two Rooms and a Boom roles",
  "descriptionKo": "두개의 방, 한개의 폭탄의 기본 역할",
  "version": "1.0",
  "roles": [
    {
      "id": "president",
      "name": "President",
      "nameKo": "대통령",
      "team": "BLUE",
      "type": "leader",
      "description": "Blue team must protect the President at all costs",
      "descriptionKo": "블루 팀은 대통령을 반드시 보호해야 합니다",
      "count": 1,
      "minPlayers": 6,
      "priority": 1,
      "color": "#0066CC",
      "icon": "👔"
    },
    {
      "id": "blue_spy",
      "name": "Blue Spy",
      "nameKo": "블루 스파이",
      "team": "BLUE",
      "type": "spy",
      "description": "Knows Blue team affiliation but appears neutral",
      "descriptionKo": "블루 팀 소속을 알지만 중립으로 보입니다",
      "count": {
        "6-9": 1,
        "10-19": 2,
        "20+": 3
      },
      "minPlayers": 6,
      "priority": 2,
      "color": "#6699FF",
      "icon": "🕵️"
    },
    {
      "id": "gambler",
      "name": "Gambler",
      "nameKo": "도박사",
      "team": "GREY",
      "type": "special",
      "description": "Chooses winning team at game end",
      "descriptionKo": "게임 종료 시 승리 팀을 선택합니다",
      "count": 1,
      "minPlayers": 10,
      "priority": 10,
      "color": "#999999",
      "icon": "🎲"
    }
  ]
}
```

**Priority**: P0 (Must Have)

#### FR-3: Configuration File Loading

**Description**: Load all role configurations from filesystem at server startup

**Requirements**:
- Read all JSON files from `backend/config/roles/` directory
- Support environment variable for config directory: `ROLES_CONFIG_DIR`
- Fall back to `standard` configuration if directory not found
- Log each loaded configuration with role count
- Cache all parsed configurations in memory
- Expose configurations via API endpoint

**Priority**: P0 (Must Have)

#### FR-4: Host Role Configuration Selection

**Description**: Allow room hosts to choose role configuration when creating room

**Requirements**:
- `POST /api/v1/rooms` accepts optional `roleConfigId` parameter
- `GET /api/v1/role-configs` endpoint lists available configurations
- Room model stores selected `roleConfigId`
- Default to `standard` if not specified
- Players can see selected configuration in lobby
- Role assignment uses selected configuration

**API Updates**:
```json
// POST /api/v1/rooms
{
  "maxPlayers": 10,
  "isPublic": true,
  "roleConfigId": "extended"  // NEW: optional, defaults to "standard"
}

// GET /api/v1/role-configs
{
  "configs": [
    {
      "id": "standard",
      "name": "Standard Game",
      "nameKo": "기본 게임",
      "description": "Standard Two Rooms and a Boom roles"
    },
    {
      "id": "extended",
      "name": "Extended Game",
      "nameKo": "확장 게임",
      "description": "Includes Doctor, Engineer, and Gambler roles"
    }
  ]
}
```

**Priority**: P0 (Must Have)

#### FR-5: Configuration Validation

**Description**: Validate role configuration integrity

**Requirements**:
- Validate JSON schema compliance
- Check for duplicate role IDs
- Verify team values (RED, BLUE, GREY)
- Ensure role counts are positive integers
- Validate player count ranges don't overlap
- Check total roles match expected player counts
- Verify required leader roles exist (President, Bomber)

**Validation Rules**:
- Each team must have at least 1 role defined
- Role IDs must be unique
- Player count ranges must be valid (e.g., "6-9", "10+")
- Count must be >= 1
- MinPlayers must be >= 6 (game minimum)
- Priority values should be unique for deterministic ordering

**Priority**: P0 (Must Have)

#### FR-6: Dynamic Role Assignment

**Description**: Assign roles based on loaded configuration

**Requirements**:
- Replace hardcoded `AssignRoles()` logic with config-driven version
- Calculate total roles needed based on player count
- Filter roles by minPlayers threshold
- Calculate role counts based on player count ranges
- Distribute roles within each team
- Handle edge cases (too many/few roles defined)
- Maintain randomization within each team

**Algorithm**:
1. Separate players by team (RED vs BLUE)
2. For each team:
   - Filter applicable roles (minPlayers <= current count)
   - Calculate exact role count based on player count
   - Sort roles by priority
   - Assign roles in priority order
   - Fill remaining slots with "operative" type roles
3. Shuffle players within each team after role assignment

**Priority**: P0 (Must Have)

#### FR-7: Default Configuration

**Description**: Provide sensible default role configuration

**Requirements**:
- Include standard Two Rooms and a Boom roles
- Match current hardcoded behavior exactly
- Serve as reference implementation
- Document all configuration options
- Ship with Docker image

**Default Roles**:
- President (BLUE, leader, 1 count)
- Bomber (RED, leader, 1 count)
- Blue Spy (BLUE, spy, 1/2 based on count)
- Red Spy (RED, spy, 1/2 based on count)
- Blue Operative (BLUE, operative, remaining)
- Red Operative (RED, operative, remaining)

**Priority**: P0 (Must Have)

#### FR-8: Error Handling

**Description**: Graceful handling of configuration errors

**Requirements**:
- Server refuses to start with invalid configuration
- Clear error messages with file location
- Syntax errors show line/column numbers
- Validation errors list all issues found
- Suggest fixes for common mistakes

**Error Types**:
- File not found: Log warning, use default
- Invalid JSON: Show syntax error, refuse to start
- Schema validation failure: List all violations, refuse to start
- Logic errors: Explain issue, refuse to start

**Priority**: P0 (Must Have)

### Non-Functional Requirements

#### NFR-1: Performance

- Configuration loading time < 100ms
- Role assignment with custom config same speed as hardcoded
- Configuration cached in memory (no disk reads during game)
- Validation completes in < 50ms

#### NFR-2: Maintainability

- Clear separation between config loader and game logic
- JSON schema documented with examples
- Unit tests for validation and assignment logic
- Integration tests with various configurations

#### NFR-3: Backward Compatibility

- Existing games continue working without changes
- Default configuration matches current behavior exactly
- No breaking changes to Player or Role models
- Existing tests pass without modification

#### NFR-4: Usability

- Configuration errors are actionable
- Example configurations provided
- JSON schema for IDE auto-complete
- Documentation includes common use cases

#### NFR-5: Security

- Configuration file read-only at runtime
- Validate all user-provided values
- Prevent code injection via configuration
- Limit file size (max 1MB)

## Technical Design

### Data Models

#### Role Configuration Schema

```go
// RoleConfig represents the root configuration structure
type RoleConfig struct {
    Version string          `json:"version"`
    Roles   []RoleDefinition `json:"roles"`
}

// RoleDefinition defines a single role type
type RoleDefinition struct {
    ID            string                 `json:"id"`
    Name          string                 `json:"name"`
    NameKo        string                 `json:"nameKo"`
    Team          models.TeamColor       `json:"team"`
    Type          RoleType               `json:"type"`
    Description   string                 `json:"description"`
    DescriptionKo string                 `json:"descriptionKo"`
    Count         RoleCount              `json:"count"`
    MinPlayers    int                    `json:"minPlayers"`
    Priority      int                    `json:"priority"`
    Color         string                 `json:"color"`
    Icon          string                 `json:"icon"`
}

// RoleType categorizes role behavior
type RoleType string

const (
    RoleTypeLeader    RoleType = "leader"
    RoleTypeSpy       RoleType = "spy"
    RoleTypeOperative RoleType = "operative"
    RoleTypeSpecial   RoleType = "special"
)

// RoleCount can be a fixed number or a map of player ranges
type RoleCount struct {
    Fixed  *int
    Ranges map[string]int // "6-9": 1, "10-19": 2, "20+": 3
}

// UnmarshalJSON handles both int and object formats
func (rc *RoleCount) UnmarshalJSON(data []byte) error {
    // Try int first
    var fixed int
    if err := json.Unmarshal(data, &fixed); err == nil {
        rc.Fixed = &fixed
        return nil
    }

    // Try object with ranges
    var ranges map[string]int
    if err := json.Unmarshal(data, &ranges); err != nil {
        return err
    }
    rc.Ranges = ranges
    return nil
}

// GetCount returns the role count for a specific player count
func (rc *RoleCount) GetCount(playerCount int) int {
    if rc.Fixed != nil {
        return *rc.Fixed
    }

    for rangeStr, count := range rc.Ranges {
        if matchesRange(playerCount, rangeStr) {
            return count
        }
    }
    return 0
}
```

#### Role Loader Service

```go
// RoleConfigLoader handles loading and validation
type RoleConfigLoader struct {
    config     *RoleConfig
    configPath string
    mu         sync.RWMutex
}

// LoadRoleConfig reads and validates role configuration
func LoadRoleConfig(path string) (*RoleConfig, error) {
    // Read file
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("failed to read config: %w", err)
    }

    // Parse JSON
    var config RoleConfig
    if err := json.Unmarshal(data, &config); err != nil {
        return nil, fmt.Errorf("invalid JSON: %w", err)
    }

    // Validate
    if err := validateRoleConfig(&config); err != nil {
        return nil, fmt.Errorf("validation failed: %w", err)
    }

    return &config, nil
}

// validateRoleConfig performs comprehensive validation
func validateRoleConfig(config *RoleConfig) error {
    // Version check
    if config.Version == "" {
        return errors.New("version is required")
    }

    // Role validation
    seenIDs := make(map[string]bool)
    for i, role := range config.Roles {
        // Duplicate ID check
        if seenIDs[role.ID] {
            return fmt.Errorf("duplicate role ID '%s' at index %d", role.ID, i)
        }
        seenIDs[role.ID] = true

        // Required fields
        if role.Name == "" {
            return fmt.Errorf("role at index %d missing name", i)
        }

        // Team validation
        if role.Team != models.TeamRed && role.Team != models.TeamBlue && role.Team != models.TeamGrey {
            return fmt.Errorf("invalid team '%s' for role '%s'", role.Team, role.ID)
        }

        // MinPlayers validation
        if role.MinPlayers < 6 {
            return fmt.Errorf("minPlayers must be >= 6 for role '%s'", role.ID)
        }

        // Count validation
        if role.Count.Fixed != nil && *role.Count.Fixed < 1 {
            return fmt.Errorf("count must be >= 1 for role '%s'", role.ID)
        }
    }

    // Team coverage check
    hasRed, hasBlue := false, false
    for _, role := range config.Roles {
        if role.Team == models.TeamRed {
            hasRed = true
        }
        if role.Team == models.TeamBlue {
            hasBlue = true
        }
    }
    if !hasRed || !hasBlue {
        return errors.New("configuration must define roles for both RED and BLUE teams")
    }

    return nil
}
```

### Configuration File Location

- **Development**: `backend/config/roles.json`
- **Production (Docker)**: `/app/config/roles.json`
- **Environment Variable**: `ROLES_CONFIG_PATH` (overrides default)
- **Fallback**: Embedded default configuration if file not found

### Integration Points

#### Server Initialization

```go
// cmd/server/main.go
func main() {
    // ... existing setup ...

    // Load role configuration
    configPath := os.Getenv("ROLES_CONFIG_PATH")
    if configPath == "" {
        configPath = "config/roles.json"
    }

    roleConfig, err := services.LoadRoleConfig(configPath)
    if err != nil {
        log.Fatalf("[FATAL] Failed to load role configuration: %v", err)
    }
    log.Printf("[INFO] Loaded %d role definitions from %s", len(roleConfig.Roles), configPath)

    // Initialize game service with role config
    gameService := services.NewGameServiceWithConfig(roomStore, roleConfig)

    // ... rest of setup ...
}
```

#### Role Assignment Update

```go
// internal/services/game_service.go

// AssignRolesWithConfig uses loaded configuration
func (s *GameService) AssignRolesWithConfig(players []*models.Player) {
    // Separate by team (RED vs BLUE)
    redTeam, blueTeam := separateByTeam(players)
    totalPlayers := len(players)

    // Assign RED team roles
    s.assignTeamRoles(redTeam, models.TeamRed, totalPlayers)

    // Assign BLUE team roles
    s.assignTeamRoles(blueTeam, models.TeamBlue, totalPlayers)
}

func (s *GameService) assignTeamRoles(team []*models.Player, teamColor models.TeamColor, totalPlayers int) {
    // Filter applicable roles for this team
    applicableRoles := []RoleDefinition{}
    for _, roleDef := range s.roleConfig.Roles {
        if roleDef.Team == teamColor && roleDef.MinPlayers <= totalPlayers {
            applicableRoles = append(applicableRoles, roleDef)
        }
    }

    // Sort by priority
    sort.Slice(applicableRoles, func(i, j int) bool {
        return applicableRoles[i].Priority < applicableRoles[j].Priority
    })

    // Shuffle team for randomization
    rand.Shuffle(len(team), func(i, j int) {
        team[i], team[j] = team[j], team[i]
    })

    // Assign roles based on priority
    playerIndex := 0
    for _, roleDef := range applicableRoles {
        count := roleDef.Count.GetCount(totalPlayers)
        for i := 0; i < count && playerIndex < len(team); i++ {
            role := models.Role(roleDef.ID)
            team[playerIndex].Role = &role
            playerIndex++
        }
    }

    // Fill remaining with default operative role
    for playerIndex < len(team) {
        operativeID := string(teamColor) + "_operative"
        role := models.Role(operativeID)
        team[playerIndex].Role = &role
        playerIndex++
    }
}
```

### Backward Compatibility Strategy

1. **Default Configuration**: Ship with `config/roles.json` matching current hardcoded behavior
2. **Gradual Migration**: Both old and new assignment methods coexist initially
3. **Feature Flag**: Use environment variable `USE_CUSTOM_ROLES=true` to enable
4. **Testing**: Validate new system produces identical results to old system
5. **Rollback**: Keep old code path for emergency fallback

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Tasks**:
1. Define RoleConfig and RoleDefinition structs
2. Implement JSON parsing and unmarshaling
3. Create validation logic with comprehensive error messages
4. Add unit tests for config loader
5. Create default roles.json matching current behavior

**Deliverables**:
- `backend/internal/config/role_config.go`
- `backend/internal/config/role_loader.go`
- `backend/config/roles.json`
- `backend/internal/config/role_config_test.go`

### Phase 2: Role Assignment Integration (Week 1-2)

**Tasks**:
1. Update GameService to accept RoleConfig
2. Implement AssignRolesWithConfig method
3. Add player count range matching logic
4. Update server initialization to load config
5. Add integration tests comparing old vs new assignment

**Deliverables**:
- Updated `backend/internal/services/game_service.go`
- Updated `backend/cmd/server/main.go`
- Integration tests in `game_service_test.go`

### Phase 3: Host Selection & Frontend Integration (Week 2)

**Tasks**:
1. Add `roleConfigId` field to Room model
2. Update CreateRoom service to accept `roleConfigId` parameter
3. Implement `GET /api/v1/role-configs` endpoint
4. Create RoleConfigSelector frontend component
5. Update Create Room dialog to include role configuration dropdown
6. Support GREY team (neutral) roles
7. Add role metadata (colors, icons) to API responses
8. Create example custom configurations

**Deliverables**:
- Updated Room model with `roleConfigId`
- `GET /api/v1/role-configs` API endpoint
- RoleConfigSelector component
- Updated Create Room UI
- `backend/config/roles/examples/` directory with sample configs
- Updated API documentation

### Phase 4: Role Display Integration (Week 2-3)

**Tasks**:
1. Update Role type to include metadata
2. Display role colors and icons in UI
3. Show role descriptions on hover/click
4. Update game view to support new role types
5. Add visual indicators for special roles

**Deliverables**:
- Updated `frontend/src/types/game.types.ts`
- Enhanced role display components
- Role tooltip/modal component

### Phase 5: Testing & Documentation (Week 3)

**Tasks**:
1. Comprehensive unit tests (90%+ coverage)
2. Integration tests with various configs
3. Load testing with complex configurations
4. Document JSON schema with JSON Schema spec
5. Create operator guide for custom roles

**Deliverables**:
- Test suite achieving 90%+ coverage
- JSON Schema file for IDE validation
- Operator documentation
- Migration guide from hardcoded roles

## Testing Strategy

### Unit Tests

```go
// Test configuration loading
func TestLoadRoleConfig(t *testing.T) {
    config, err := LoadRoleConfig("testdata/valid_config.json")
    assert.NoError(t, err)
    assert.Equal(t, "1.0", config.Version)
    assert.Len(t, config.Roles, 6)
}

// Test validation
func TestValidateRoleConfig_DuplicateIDs(t *testing.T) {
    config := &RoleConfig{
        Version: "1.0",
        Roles: []RoleDefinition{
            {ID: "test", Name: "Test1", Team: TeamRed},
            {ID: "test", Name: "Test2", Team: TeamBlue},
        },
    }
    err := validateRoleConfig(config)
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "duplicate role ID")
}

// Test role count calculation
func TestRoleCount_GetCount(t *testing.T) {
    count := RoleCount{
        Ranges: map[string]int{
            "6-9": 1,
            "10-19": 2,
            "20+": 3,
        },
    }
    assert.Equal(t, 1, count.GetCount(7))
    assert.Equal(t, 2, count.GetCount(15))
    assert.Equal(t, 3, count.GetCount(25))
}
```

### Integration Tests

- Load default configuration and assign roles for 6, 10, 20 players
- Compare assignment results with old hardcoded logic
- Test with custom configuration containing GREY team roles
- Validate error handling with malformed configs

### End-to-End Tests

- Start server with custom configuration
- Create game and verify custom roles assigned
- Check role metadata in API responses
- Verify frontend displays custom roles correctly

## Configuration Examples

### Example 1: Standard Configuration

Location: `backend/config/roles.json`

```json
{
  "version": "1.0",
  "roles": [
    {
      "id": "president",
      "name": "President",
      "nameKo": "대통령",
      "team": "BLUE",
      "type": "leader",
      "description": "The Blue team must protect the President",
      "descriptionKo": "블루 팀은 대통령을 보호해야 합니다",
      "count": 1,
      "minPlayers": 6,
      "priority": 1,
      "color": "#0066CC",
      "icon": "👔"
    },
    {
      "id": "bomber",
      "name": "Bomber",
      "nameKo": "폭탄범",
      "team": "RED",
      "type": "leader",
      "description": "The Red team wins if Bomber meets President",
      "descriptionKo": "폭탄범이 대통령을 만나면 레드 팀이 승리합니다",
      "count": 1,
      "minPlayers": 6,
      "priority": 1,
      "color": "#CC0000",
      "icon": "💣"
    },
    {
      "id": "blue_spy",
      "name": "Blue Spy",
      "nameKo": "블루 스파이",
      "team": "BLUE",
      "type": "spy",
      "description": "Knows Blue affiliation but appears neutral",
      "descriptionKo": "블루 소속을 알지만 중립으로 보입니다",
      "count": {
        "6-9": 1,
        "10+": 2
      },
      "minPlayers": 6,
      "priority": 2,
      "color": "#6699FF",
      "icon": "🕵️"
    },
    {
      "id": "red_spy",
      "name": "Red Spy",
      "nameKo": "레드 스파이",
      "team": "RED",
      "type": "spy",
      "description": "Knows Red affiliation but appears neutral",
      "descriptionKo": "레드 소속을 알지만 중립으로 보입니다",
      "count": {
        "6-9": 1,
        "10+": 2
      },
      "minPlayers": 6,
      "priority": 2,
      "color": "#FF6666",
      "icon": "🕵️"
    },
    {
      "id": "blue_operative",
      "name": "Blue Operative",
      "nameKo": "블루 요원",
      "team": "BLUE",
      "type": "operative",
      "description": "Standard Blue team member",
      "descriptionKo": "블루 팀의 일반 요원입니다",
      "count": 99,
      "minPlayers": 6,
      "priority": 99,
      "color": "#3399FF",
      "icon": "👤"
    },
    {
      "id": "red_operative",
      "name": "Red Operative",
      "nameKo": "레드 요원",
      "team": "RED",
      "type": "operative",
      "description": "Standard Red team member",
      "descriptionKo": "레드 팀의 일반 요원입니다",
      "count": 99,
      "minPlayers": 6,
      "priority": 99,
      "color": "#FF3333",
      "icon": "👤"
    }
  ]
}
```

### Example 2: Extended Game Mode

Location: `backend/config/examples/extended_roles.json`

```json
{
  "version": "1.0",
  "roles": [
    {
      "id": "president",
      "name": "President",
      "team": "BLUE",
      "type": "leader",
      "count": 1,
      "minPlayers": 6,
      "priority": 1
    },
    {
      "id": "bomber",
      "name": "Bomber",
      "team": "RED",
      "type": "leader",
      "count": 1,
      "minPlayers": 6,
      "priority": 1
    },
    {
      "id": "doctor",
      "name": "Doctor",
      "nameKo": "의사",
      "team": "BLUE",
      "type": "special",
      "description": "Can save the President once per game",
      "descriptionKo": "게임당 한 번 대통령을 구할 수 있습니다",
      "count": 1,
      "minPlayers": 10,
      "priority": 2,
      "color": "#00CC66",
      "icon": "👨‍⚕️"
    },
    {
      "id": "engineer",
      "name": "Engineer",
      "nameKo": "공학자",
      "team": "RED",
      "type": "special",
      "description": "Can defuse or arm bombs",
      "descriptionKo": "폭탄을 해제하거나 설치할 수 있습니다",
      "count": 1,
      "minPlayers": 10,
      "priority": 2,
      "color": "#CC6600",
      "icon": "👷"
    },
    {
      "id": "gambler",
      "name": "Gambler",
      "nameKo": "도박사",
      "team": "GREY",
      "type": "special",
      "description": "Chooses winning team at game end",
      "descriptionKo": "게임 종료 시 승리 팀을 선택합니다",
      "count": 1,
      "minPlayers": 12,
      "priority": 3,
      "color": "#999999",
      "icon": "🎲"
    },
    {
      "id": "blue_spy",
      "name": "Blue Spy",
      "team": "BLUE",
      "type": "spy",
      "count": {"6-9": 1, "10-15": 2, "16+": 3},
      "minPlayers": 6,
      "priority": 10
    },
    {
      "id": "red_spy",
      "name": "Red Spy",
      "team": "RED",
      "type": "spy",
      "count": {"6-9": 1, "10-15": 2, "16+": 3},
      "minPlayers": 6,
      "priority": 10
    },
    {
      "id": "blue_operative",
      "name": "Blue Operative",
      "team": "BLUE",
      "type": "operative",
      "count": 99,
      "minPlayers": 6,
      "priority": 99
    },
    {
      "id": "red_operative",
      "name": "Red Operative",
      "team": "RED",
      "type": "operative",
      "count": 99,
      "minPlayers": 6,
      "priority": 99
    }
  ]
}
```

## Security Considerations

### Configuration File Security

- Configuration file read-only at runtime
- Validate file permissions on load (warn if world-writable)
- Limit file size to 1MB to prevent DoS
- Sanitize all string fields to prevent injection

### Validation Security

- Reject configurations with suspiciously large counts (> 100)
- Validate all color codes (hex format only)
- Limit description lengths (max 500 chars)
- Reject configurations attempting path traversal in IDs

### Runtime Security

- Configuration cannot be modified during gameplay
- Hot-reload (if implemented) requires authentication
- Log all configuration changes for audit trail
- Rate limit hot-reload endpoint

## Rollout Plan

### Week 1: Development
- Implement core configuration loading
- Add validation logic
- Create default configuration
- Unit tests for all components

### Week 2: Integration
- Integrate with GameService
- Update server initialization
- Integration testing
- Documentation

### Week 3: Testing & Deployment
- Comprehensive test suite
- Load testing with various configs
- Create example configurations
- Deploy to staging

### Week 4: Production Rollout
- Deploy to production with default config
- Monitor for errors
- Gather feedback
- Document lessons learned

## Success Metrics

1. **Configuration Loading**: 100% success rate on valid configs
2. **Role Assignment**: Identical behavior to hardcoded version with default config
3. **Performance**: < 5% overhead compared to hardcoded version
4. **Host Adoption**: At least 30% of rooms created with non-default configuration within 2 weeks
5. **Configuration Variety**: Game operators create at least 3 custom configurations within 1 month
6. **User Satisfaction**: > 80% of hosts find role configuration selection useful (survey)
7. **Errors**: Zero production incidents related to role configuration

## Risks & Mitigations

### Risk 1: Invalid Configurations in Production

**Risk**: Operator deploys invalid config, breaking games

**Mitigation**:
- Comprehensive validation on startup
- Server refuses to start with invalid config
- Validation tool for pre-deployment testing
- Default fallback configuration

### Risk 2: Performance Degradation

**Risk**: Dynamic loading slower than hardcoded logic

**Mitigation**:
- Cache parsed configuration in memory
- Benchmark against hardcoded version
- Optimize role lookup with maps/indexes
- Profile and optimize hot paths

### Risk 3: Backward Compatibility Issues

**Risk**: New system breaks existing games

**Mitigation**:
- Default config matches current behavior exactly
- Extensive integration testing
- Feature flag for gradual rollout
- Keep old code path for emergency rollback

### Risk 4: Host Confusion with Multiple Options

**Risk**: Too many role configuration options confuse hosts

**Mitigation**:
- Default to "Standard" configuration (recommended)
- Clear descriptions for each configuration
- Preview role list before creating room (optional)
- Limit to 5-10 predefined configurations
- Add tooltips explaining each game mode

## Future Enhancements

### Phase 2: Advanced Features
- Role abilities and actions
- Conditional roles (appear only if X happens)
- Role chains (one role triggers another)
- Weighted random role selection

### Phase 3: Management UI
- Web-based configuration editor
- Visual role designer
- Configuration version control
- Role testing sandbox

### Phase 4: Community Features
- Share configurations with other operators
- Role marketplace
- Community voting on configurations
- Official "tournament" configurations

## Appendix

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "roles"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$"
    },
    "roles": {
      "type": "array",
      "minItems": 2,
      "items": {
        "type": "object",
        "required": ["id", "name", "team", "type", "count", "minPlayers", "priority"],
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^[a-z_]+$"
          },
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 50
          },
          "nameKo": {
            "type": "string",
            "maxLength": 50
          },
          "team": {
            "type": "string",
            "enum": ["RED", "BLUE", "GREY"]
          },
          "type": {
            "type": "string",
            "enum": ["leader", "spy", "operative", "special"]
          },
          "description": {
            "type": "string",
            "maxLength": 500
          },
          "descriptionKo": {
            "type": "string",
            "maxLength": 500
          },
          "count": {
            "oneOf": [
              {
                "type": "integer",
                "minimum": 1
              },
              {
                "type": "object",
                "patternProperties": {
                  "^\\d+-\\d+$|^\\d+\\+$": {
                    "type": "integer",
                    "minimum": 1
                  }
                }
              }
            ]
          },
          "minPlayers": {
            "type": "integer",
            "minimum": 6,
            "maximum": 30
          },
          "priority": {
            "type": "integer",
            "minimum": 1,
            "maximum": 100
          },
          "color": {
            "type": "string",
            "pattern": "^#[0-9A-Fa-f]{6}$"
          },
          "icon": {
            "type": "string",
            "maxLength": 10
          }
        }
      }
    }
  }
}
```

### Configuration Validation Tool

```bash
#!/bin/bash
# tools/validate_roles.sh

CONFIG_FILE=${1:-backend/config/roles.json}

echo "Validating role configuration: $CONFIG_FILE"

# Check file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: File not found: $CONFIG_FILE"
    exit 1
fi

# Validate JSON syntax
if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
    echo "ERROR: Invalid JSON syntax"
    exit 1
fi

# Validate against schema (requires ajv-cli)
if command -v ajv &> /dev/null; then
    ajv validate -s backend/config/roles.schema.json -d "$CONFIG_FILE"
else
    echo "WARNING: ajv-cli not installed, skipping schema validation"
fi

# Run Go validation
cd backend && go run cmd/tools/validate_config.go "$CONFIG_FILE"

echo "Validation complete!"
```

### Related Features

- Feature 001: Multiplayer Game Host
- Feature 004: Game Statistics (future)
- Feature 005: Advanced Role Actions (future)

### Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-07 | 1.0 | Initial specification | Claude |

---

**Document Status**: Draft
**Last Updated**: 2025-11-07
**Next Review**: 2025-11-14
