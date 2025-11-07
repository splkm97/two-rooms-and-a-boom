# Implementation Plan: Custom Role System

**Feature ID**: 003
**Created**: 2025-11-07
**Status**: Ready for Implementation

## Overview

This plan outlines the step-by-step implementation of the custom role system, allowing game operators to define roles via JSON configuration and hosts to select role configurations when creating rooms.

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

#### Task 1.1: Define Role Configuration Data Structures

**File**: `backend/internal/config/role_config.go`

**Implementation**:
```go
package config

import (
	"encoding/json"
	"github.com/kalee/two-rooms-and-a-boom/internal/models"
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

// RoleDefinition defines a single role type
type RoleDefinition struct {
	ID            string           `json:"id"`
	Name          string           `json:"name"`
	NameKo        string           `json:"nameKo"`
	Team          models.TeamColor `json:"team"`
	Type          RoleType         `json:"type"`
	Description   string           `json:"description"`
	DescriptionKo string           `json:"descriptionKo"`
	Count         RoleCount        `json:"count"`
	MinPlayers    int              `json:"minPlayers"`
	Priority      int              `json:"priority"`
	Color         string           `json:"color"`
	Icon          string           `json:"icon"`
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
	Fixed  *int           `json:"-"`
	Ranges map[string]int `json:"-"`
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

// matchesRange checks if a player count matches a range string
func matchesRange(playerCount int, rangeStr string) bool {
	// Parse range strings like "6-9", "10-19", "20+"
	// Implementation details...
	return false // Placeholder
}
```

**Tests**: `backend/internal/config/role_config_test.go`

**Acceptance Criteria**:
- [ ] RoleConfig struct defined with all fields
- [ ] RoleCount supports both fixed and range-based counts
- [ ] UnmarshalJSON correctly parses both formats
- [ ] GetCount returns correct count for player ranges
- [ ] Unit tests achieve 90%+ coverage

---

#### Task 1.2: Implement Role Configuration Loader

**File**: `backend/internal/config/role_loader.go`

**Implementation**:
```go
package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// RoleConfigLoader handles loading and caching role configurations
type RoleConfigLoader struct {
	configs    map[string]*RoleConfig // id -> config
	configsDir string
}

// NewRoleConfigLoader creates a new loader
func NewRoleConfigLoader(configsDir string) *RoleConfigLoader {
	return &RoleConfigLoader{
		configs:    make(map[string]*RoleConfig),
		configsDir: configsDir,
	}
}

// LoadAll loads all role configurations from the directory
func (l *RoleConfigLoader) LoadAll() error {
	// Check if directory exists
	if _, err := os.Stat(l.configsDir); os.IsNotExist(err) {
		return fmt.Errorf("config directory not found: %s", l.configsDir)
	}

	// Read all JSON files
	files, err := filepath.Glob(filepath.Join(l.configsDir, "*.json"))
	if err != nil {
		return fmt.Errorf("failed to list config files: %w", err)
	}

	if len(files) == 0 {
		return fmt.Errorf("no role configuration files found in %s", l.configsDir)
	}

	// Load each file
	for _, file := range files {
		config, err := l.loadFile(file)
		if err != nil {
			return fmt.Errorf("failed to load %s: %w", file, err)
		}

		// Store by ID
		l.configs[config.ID] = config
	}

	return nil
}

// loadFile loads a single configuration file
func (l *RoleConfigLoader) loadFile(path string) (*RoleConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

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

// Get returns a configuration by ID
func (l *RoleConfigLoader) Get(id string) (*RoleConfig, error) {
	config, ok := l.configs[id]
	if !ok {
		return nil, fmt.Errorf("configuration not found: %s", id)
	}
	return config, nil
}

// GetAll returns all loaded configurations
func (l *RoleConfigLoader) GetAll() map[string]*RoleConfig {
	return l.configs
}

// GetList returns a list of configuration metadata
func (l *RoleConfigLoader) GetList() []RoleConfigMeta {
	list := make([]RoleConfigMeta, 0, len(l.configs))
	for _, config := range l.configs {
		list = append(list, RoleConfigMeta{
			ID:            config.ID,
			Name:          config.Name,
			NameKo:        config.NameKo,
			Description:   config.Description,
			DescriptionKo: config.DescriptionKo,
		})
	}
	return list
}

// RoleConfigMeta represents configuration metadata for API responses
type RoleConfigMeta struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	NameKo        string `json:"nameKo"`
	Description   string `json:"description"`
	DescriptionKo string `json:"descriptionKo"`
}
```

**Tests**: `backend/internal/config/role_loader_test.go`

**Acceptance Criteria**:
- [ ] LoadAll reads all .json files from directory
- [ ] Get returns configuration by ID
- [ ] GetList returns metadata for API
- [ ] Error handling for missing/invalid files
- [ ] Unit tests achieve 90%+ coverage

---

#### Task 1.3: Implement Configuration Validation

**File**: `backend/internal/config/role_validator.go`

**Implementation**:
```go
package config

import (
	"errors"
	"fmt"
	"github.com/kalee/two-rooms-and-a-boom/internal/models"
)

// validateRoleConfig performs comprehensive validation
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
		if role.Team != models.TeamRed && role.Team != models.TeamBlue && role.Team != models.TeamGrey {
			errs = append(errs, fmt.Errorf("invalid team '%s' for role '%s'", role.Team, role.ID))
		}

		// Track team coverage
		if role.Team == models.TeamRed {
			hasRed = true
		}
		if role.Team == models.TeamBlue {
			hasBlue = true
		}

		// MinPlayers validation
		if role.MinPlayers < 6 {
			errs = append(errs, fmt.Errorf("minPlayers must be >= 6 for role '%s'", role.ID))
		}

		// Count validation
		if role.Count.Fixed != nil && *role.Count.Fixed < 1 {
			errs = append(errs, fmt.Errorf("count must be >= 1 for role '%s'", role.ID))
		}

		// Type validation
		validTypes := map[RoleType]bool{
			RoleTypeLeader:    true,
			RoleTypeSpy:       true,
			RoleTypeOperative: true,
			RoleTypeSpecial:   true,
		}
		if !validTypes[role.Type] {
			errs = append(errs, fmt.Errorf("invalid type '%s' for role '%s'", role.Type, role.ID))
		}
	}

	// Team coverage check
	if !hasRed || !hasBlue {
		errs = append(errs, errors.New("configuration must define roles for both RED and BLUE teams"))
	}

	// Combine errors
	if len(errs) > 0 {
		return fmt.Errorf("validation errors: %v", errs)
	}

	return nil
}
```

**Tests**: `backend/internal/config/role_validator_test.go`

**Acceptance Criteria**:
- [ ] Validates all required fields
- [ ] Checks for duplicate role IDs
- [ ] Verifies team coverage (RED + BLUE required)
- [ ] Validates player count thresholds
- [ ] Returns detailed error messages
- [ ] Unit tests cover all validation cases

---

#### Task 1.4: Create Default Role Configurations

**File**: `backend/config/roles/standard.json`

**Content**:
```json
{
  "id": "standard",
  "name": "Standard Game",
  "nameKo": "기본 게임",
  "description": "Standard Two Rooms and a Boom roles",
  "descriptionKo": "투 룸즈 앤 어 붐의 기본 역할",
  "version": "1.0",
  "roles": [
    {
      "id": "president",
      "name": "President",
      "nameKo": "대통령",
      "team": "BLUE",
      "type": "leader",
      "description": "Blue team must protect the President",
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
      "description": "Red team wins if Bomber meets President",
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

**File**: `backend/config/roles/extended.json`

**Content**: (Include Doctor, Engineer, Gambler roles)

**Acceptance Criteria**:
- [ ] standard.json matches current hardcoded behavior
- [ ] extended.json includes custom roles
- [ ] Both files pass validation
- [ ] JSON is properly formatted

---

### Phase 2: Role Assignment Integration (Week 1-2)

#### Task 2.1: Update GameService for Config-Driven Assignment

**File**: `backend/internal/services/game_service.go`

**Changes**:
```go
type GameService struct {
	roomStore  *store.RoomStore
	hub        Hub
	roleLoader *config.RoleConfigLoader // NEW
}

// NewGameServiceWithConfig creates service with role config loader
func NewGameServiceWithConfig(roomStore *store.RoomStore, roleLoader *config.RoleConfigLoader) *GameService {
	return &GameService{
		roomStore:  roomStore,
		hub:        nil,
		roleLoader: roleLoader,
	}
}

// AssignRolesWithConfig uses configuration to assign roles
func (s *GameService) AssignRolesWithConfig(players []*models.Player, configID string) error {
	// Get configuration
	config, err := s.roleLoader.Get(configID)
	if err != nil {
		return fmt.Errorf("failed to get role config: %w", err)
	}

	// Separate by team
	redTeam, blueTeam := separateByTeam(players)
	totalPlayers := len(players)

	// Assign RED team roles
	if err := s.assignTeamRoles(redTeam, models.TeamRed, totalPlayers, config); err != nil {
		return err
	}

	// Assign BLUE team roles
	if err := s.assignTeamRoles(blueTeam, models.TeamBlue, totalPlayers, config); err != nil {
		return err
	}

	return nil
}

func (s *GameService) assignTeamRoles(team []*models.Player, teamColor models.TeamColor, totalPlayers int, config *config.RoleConfig) error {
	// Filter applicable roles for this team
	applicableRoles := []config.RoleDefinition{}
	for _, roleDef := range config.Roles {
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

	return nil
}
```

**Acceptance Criteria**:
- [ ] AssignRolesWithConfig replaces old AssignRoles
- [ ] Roles assigned based on configuration
- [ ] Priority ordering respected
- [ ] Team shuffling maintained
- [ ] Integration tests pass

---

### Phase 3: Host Selection & API (Week 2)

#### Task 3.1: Update Room Model

**File**: `backend/internal/models/room.go`

**Changes**:
```go
type Room struct {
	Code         string       `json:"code"`
	Status       RoomStatus   `json:"status"`
	Players      []*Player    `json:"players"`
	MaxPlayers   int          `json:"maxPlayers"`
	GameSession  *GameSession `json:"gameSession"`
	IsPublic     bool         `json:"isPublic"`
	RoleConfigID string       `json:"roleConfigId"` // NEW
	HostNickname string       `json:"hostNickname,omitempty"`
	CreatedAt    time.Time    `json:"createdAt"`
	UpdatedAt    time.Time    `json:"updatedAt"`
}
```

**Acceptance Criteria**:
- [ ] RoleConfigID field added
- [ ] JSON serialization works
- [ ] Existing code compatible

---

#### Task 3.2: Implement GET /api/v1/role-configs Endpoint

**File**: `backend/internal/handlers/role_config_handler.go`

**Implementation**:
```go
package handlers

import (
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/kalee/two-rooms-and-a-boom/internal/config"
)

type RoleConfigHandler struct {
	roleLoader *config.RoleConfigLoader
}

func NewRoleConfigHandler(roleLoader *config.RoleConfigLoader) *RoleConfigHandler {
	return &RoleConfigHandler{
		roleLoader: roleLoader,
	}
}

// ListRoleConfigs handles GET /api/v1/role-configs
func (h *RoleConfigHandler) ListRoleConfigs(c *gin.Context) {
	configs := h.roleLoader.GetList()
	c.JSON(http.StatusOK, gin.H{
		"configs": configs,
	})
}
```

**Update**: `backend/cmd/server/main.go`

**Acceptance Criteria**:
- [ ] Endpoint returns all configurations
- [ ] Response includes id, name, description
- [ ] No sensitive data exposed
- [ ] Integration test passes

---

#### Task 3.3: Update CreateRoom to Accept roleConfigId

**File**: `backend/internal/handlers/room_handler.go`

**Changes**:
```go
type CreateRoomRequest struct {
	MaxPlayers   int    `json:"maxPlayers" binding:"required,min=6,max=30"`
	IsPublic     *bool  `json:"isPublic"`
	RoleConfigID string `json:"roleConfigId"` // NEW, optional
}

func (h *RoomHandler) CreateRoom(c *gin.Context) {
	var req CreateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_REQUEST",
			"message": err.Error(),
		})
		return
	}

	// Default to true if not specified
	isPublic := true
	if req.IsPublic != nil {
		isPublic = *req.IsPublic
	}

	// Default to "standard" if not specified
	roleConfigID := req.RoleConfigID
	if roleConfigID == "" {
		roleConfigID = "standard"
	}

	// Validate role config exists
	if _, err := h.roleLoader.Get(roleConfigID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_ROLE_CONFIG",
			"message": fmt.Sprintf("Role configuration '%s' not found", roleConfigID),
		})
		return
	}

	room, err := h.roomService.CreateRoom(req.MaxPlayers, isPublic, roleConfigID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "CREATE_ROOM_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, room)
}
```

**Acceptance Criteria**:
- [ ] roleConfigId parameter accepted
- [ ] Defaults to "standard"
- [ ] Validates config exists
- [ ] Room stores roleConfigId
- [ ] Integration tests pass

---

### Phase 4: Frontend Integration (Week 2-3)

#### Task 4.1: Create RoleConfigSelector Component

**File**: `frontend/src/components/RoleConfigSelector.tsx`

**Implementation**:
```typescript
import { useState, useEffect } from 'react';
import { getRoleConfigs, RoleConfigMeta } from '../services/api';

interface RoleConfigSelectorProps {
  value: string;
  onChange: (configId: string) => void;
}

export function RoleConfigSelector({ value, onChange }: RoleConfigSelectorProps) {
  const [configs, setConfigs] = useState<RoleConfigMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await getRoleConfigs();
      setConfigs(response.configs);
    } catch (err) {
      setError('역할 설정을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return <div style={{ color: '#cc0000' }}>{error}</div>;
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{
        display: 'block',
        marginBottom: '0.5rem',
        fontSize: 'clamp(0.875rem, 2vw, 1rem)',
        fontWeight: 500,
      }}>
        게임 모드
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: 'clamp(0.75rem, 2vw, 0.875rem)',
          fontSize: 'clamp(0.875rem, 2vw, 1rem)',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
        }}
      >
        {configs.map((config) => (
          <option key={config.id} value={config.id}>
            {config.nameKo || config.name}
          </option>
        ))}
      </select>
      {configs.find(c => c.id === value) && (
        <div style={{
          marginTop: '0.5rem',
          fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
          color: '#666',
        }}>
          {configs.find(c => c.id === value)?.descriptionKo ||
           configs.find(c => c.id === value)?.description}
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Lists all available configurations
- [ ] Shows Korean descriptions
- [ ] Handles loading/error states
- [ ] Mobile responsive
- [ ] Accessible (keyboard navigation)

---

#### Task 4.2: Update API Service

**File**: `frontend/src/services/api.ts`

**Changes**:
```typescript
export interface RoleConfigMeta {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
}

export interface RoleConfigsResponse {
  configs: RoleConfigMeta[];
}

export async function getRoleConfigs(): Promise<RoleConfigsResponse> {
  const response = await fetch(`${API_BASE_URL}/role-configs`);
  if (!response.ok) {
    throw new APIError(
      response.status,
      'FETCH_CONFIGS_FAILED',
      '역할 설정을 불러올 수 없습니다'
    );
  }
  return response.json();
}

// Update createRoom to accept roleConfigId
export async function createRoom(
  maxPlayers: number,
  isPublic: boolean = true,
  roleConfigId: string = 'standard'
): Promise<Room> {
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxPlayers, isPublic, roleConfigId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new APIError(
      response.status,
      error.code,
      error.message === 'insufficient players: minimum 6 required'
        ? '최소 6명의 플레이어가 필요합니다'
        : '방 생성에 실패했습니다'
    );
  }

  return response.json();
}
```

**Acceptance Criteria**:
- [ ] getRoleConfigs API method added
- [ ] createRoom accepts roleConfigId
- [ ] Error handling for failed requests
- [ ] TypeScript types defined

---

#### Task 4.3: Update Create Room Dialog

**File**: `frontend/src/pages/HomePage.tsx`

**Changes**:
```typescript
export function HomePage() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [roleConfigId, setRoleConfigId] = useState('standard'); // NEW
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError('');
    try {
      const room = await createRoom(10, isPublic, roleConfigId); // Updated
      navigate(`/room/${room.code}?view=lobby`);
    } catch (err) {
      setError(err instanceof APIError ? err.userMessage : '방 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  // In the dialog render:
  return (
    // ...
    {showCreateDialog && (
      <div className="dialog-overlay">
        <div className="dialog-content">
          <h2>방 만들기</h2>

          <RoleConfigSelector
            value={roleConfigId}
            onChange={setRoleConfigId}
          />

          <RoomVisibilityToggle value={isPublic} onChange={setIsPublic} />

          <div className="button-group">
            <button onClick={handleCreateRoom} disabled={isCreating}>
              {isCreating ? '생성 중...' : '방 만들기'}
            </button>
            <button onClick={handleCancelCreate} disabled={isCreating}>
              취소
            </button>
          </div>
        </div>
      </div>
    )}
  );
}
```

**Acceptance Criteria**:
- [ ] RoleConfigSelector integrated
- [ ] Default selection is "standard"
- [ ] Selection passed to createRoom
- [ ] UI is mobile-friendly
- [ ] Error handling works

---

### Phase 5: Testing & Polish (Week 3)

#### Task 5.1: Unit Tests

**Backend Tests**:
- `role_config_test.go`: Test RoleCount parsing and GetCount logic
- `role_loader_test.go`: Test loading, validation, error handling
- `role_validator_test.go`: Test all validation rules
- `game_service_test.go`: Test role assignment with configs

**Frontend Tests**:
- `RoleConfigSelector.test.tsx`: Test component rendering and selection
- `api.test.ts`: Test getRoleConfigs and updated createRoom

**Acceptance Criteria**:
- [ ] Backend unit tests achieve 90%+ coverage
- [ ] Frontend unit tests achieve 80%+ coverage
- [ ] All edge cases covered
- [ ] Mock data used appropriately

---

#### Task 5.2: Integration Tests

**File**: `backend/internal/integration/role_config_test.go`

**Tests**:
1. Load configurations on server startup
2. Create room with standard config → verify default roles
3. Create room with extended config → verify custom roles
4. GET /api/v1/role-configs returns all configs
5. Invalid roleConfigId rejected with 400 error

**Acceptance Criteria**:
- [ ] All integration tests pass
- [ ] End-to-end flow validated
- [ ] Error cases tested

---

#### Task 5.3: Documentation

**Files to Update**:
- `README.md`: Add custom role system documentation
- `docs/role-configuration.md`: Detailed guide for operators
- `docs/api.md`: Document new endpoints

**Content**:
- How to add custom configurations
- JSON schema reference
- Example configurations
- Validation rules
- Troubleshooting guide

**Acceptance Criteria**:
- [ ] Documentation is clear and complete
- [ ] Examples provided
- [ ] Screenshots included
- [ ] Tested by non-developer

---

## Rollout Strategy

### Week 3: Staging Deployment

1. Deploy to staging environment
2. Load test with 100 concurrent rooms
3. Test all 3 configurations (standard, extended, experimental)
4. Verify role assignment correctness
5. Check performance metrics

### Week 4: Production Rollout

1. **Day 1**: Deploy backend with feature flag disabled
2. **Day 2**: Enable for 10% of users
3. **Day 4**: Monitor metrics, increase to 50%
4. **Day 7**: Full rollout to 100%
5. **Day 14**: Gather user feedback via survey

### Rollback Plan

If issues detected:
1. Disable feature flag immediately
2. Revert to hardcoded role assignment
3. Investigate logs and errors
4. Fix issues in development
5. Re-deploy with fixes

---

## Success Criteria

- [ ] All unit tests pass (90%+ coverage)
- [ ] All integration tests pass
- [ ] Performance overhead < 5%
- [ ] Zero production errors
- [ ] 30% of rooms use non-default config within 2 weeks
- [ ] > 80% host satisfaction (survey)

---

## Dependencies

- Go 1.21+
- React 18+
- TypeScript 4.9+
- Existing backend/frontend infrastructure

---

## Timeline Summary

| Week | Phase | Tasks | Deliverables |
|------|-------|-------|--------------|
| 1 | Core Infrastructure | 1.1-1.4 | Config structs, loader, validator, default configs |
| 1-2 | Role Assignment | 2.1 | Updated GameService |
| 2 | Host Selection & API | 3.1-3.3 | Room model, endpoints, handlers |
| 2-3 | Frontend | 4.1-4.3 | Components, API updates, UI integration |
| 3 | Testing & Polish | 5.1-5.3 | Tests, docs, polish |
| 3-4 | Rollout | - | Staging → Production |

---

**Last Updated**: 2025-11-07
**Status**: Ready for implementation
