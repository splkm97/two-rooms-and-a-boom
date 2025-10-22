# Data Model: 멀티플레이어 역할 배분 시스템

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)
**Created**: 2025-10-22 | **Phase**: 1 (Design)

## Overview

이 문서는 "두개의 방, 한개의 폭탄" 역할 배분 시스템의 핵심 데이터 모델을 정의합니다. spec.md의 Key Entities 섹션을 기반으로 작성되었으며, 인메모리 저장소에서 관리되는 도메인 모델을 설명합니다.

## Core Entities

### 1. Player (플레이어)

플레이어는 게임에 참여하는 개별 사용자를 나타냅니다.

```go
type Player struct {
    ID          string    `json:"id"`           // UUID
    Nickname    string    `json:"nickname"`     // 사용자 닉네임 (2-20자)
    IsAnonymous bool      `json:"isAnonymous"`  // 익명 닉네임 여부
    RoomCode    string    `json:"roomCode"`     // 속한 방 코드
    IsOwner     bool      `json:"isOwner"`      // 방장 여부
    Role        *Role     `json:"role"`         // 할당된 역할 (게임 시작 후)
    Team        TeamColor `json:"team"`         // 소속 팀 (RED/BLUE)
    CurrentRoom RoomColor `json:"currentRoom"`  // 현재 위치한 방 (RED_ROOM/BLUE_ROOM)
    ConnectedAt time.Time `json:"connectedAt"`  // 입장 시각
}

type TeamColor string
const (
    TeamRed  TeamColor = "RED"
    TeamBlue TeamColor = "BLUE"
)

type RoomColor string
const (
    RedRoom  RoomColor = "RED_ROOM"
    BlueRoom RoomColor = "BLUE_ROOM"
)
```

**Validation Rules**:
- `Nickname`: 2-20자, 영문/한글/숫자만 허용
- `ID`: UUID v4 형식
- `Role`: 게임 시작 전에는 nil
- `Team`: 게임 시작 후 RED 또는 BLUE
- `CurrentRoom`: 게임 시작 후 RED_ROOM 또는 BLUE_ROOM

**Business Rules** (from spec.md):
- FR-003: 플레이어 입장 시 자동으로 익명 닉네임 부여 (예: "플레이어1")
- FR-004: 대기실에서 닉네임 변경 가능
- FR-005: 닉네임 중복 시 자동으로 숫자 추가 (예: "홍길동" → "홍길동(2)")
- FR-008: 게임 시작 시 팀 자동 균등 분배, 홀수일 경우 레드 팀 +1
- FR-013: 게임 시작 시 방 자동 균등 분배

### 2. Room (게임 방)

게임 방은 플레이어들이 모여 역할 배분을 받는 세션입니다.

```go
type Room struct {
    Code        string      `json:"code"`        // 6자리 고유 코드 (예: "ABC123")
    Status      RoomStatus  `json:"status"`      // 방 상태
    Players     []*Player   `json:"players"`     // 참가자 목록
    MaxPlayers  int         `json:"maxPlayers"`  // 최대 인원 (6-30명)
    GameSession *GameSession `json:"gameSession"` // 게임 세션 (게임 시작 후)
    CreatedAt   time.Time   `json:"createdAt"`   // 생성 시각
    UpdatedAt   time.Time   `json:"updatedAt"`   // 최종 업데이트 시각
}

type RoomStatus string
const (
    RoomStatusWaiting    RoomStatus = "WAITING"     // 대기 중
    RoomStatusInProgress RoomStatus = "IN_PROGRESS" // 게임 진행 중
)
```

**Validation Rules**:
- `Code`: 6자리 대문자 영숫자, 전역 고유
- `MaxPlayers`: 6 이상 30 이하
- `Players`: 최소 6명부터 게임 시작 가능 (FR-007)
- 게임 시작 시 `Status`는 `WAITING` → `IN_PROGRESS`

**Business Rules** (from spec.md):
- FR-001: 방 생성 시 고유 코드 자동 생성
- FR-006: 대기실에서 플레이어 목록 실시간 표시
- FR-007: 최소 6명부터 게임 시작 가능
- FR-017: 방장 퇴장 시 자동으로 다음 플레이어에게 권한 이전

**Lifecycle**:
```
WAITING → IN_PROGRESS → WAITING (대기실 복귀)
   ↓           ↓
(플레이어 입장) (역할 배분)
```

### 3. GameSession (게임 세션)

게임 세션은 게임 시작 후 역할 배분 및 방 배정 정보를 관리합니다.

```go
type GameSession struct {
    RoomCode         string     `json:"roomCode"`         // 속한 방 코드
    RedTeam          []*Player  `json:"redTeam"`          // 빨간 팀 플레이어
    BlueTeam         []*Player  `json:"blueTeam"`         // 파란 팀 플레이어
    RedRoomPlayers   []*Player  `json:"redRoomPlayers"`   // 빨간 방 플레이어
    BlueRoomPlayers  []*Player  `json:"blueRoomPlayers"`  // 파란 방 플레이어
    StartedAt        time.Time  `json:"startedAt"`        // 게임 시작 시각
}
```

**Validation Rules**:
- `RedTeam`과 `BlueTeam`: 각 팀 최소 3명, 가능한 균등 분배 (홀수일 경우 RedTeam +1)
- `RedRoomPlayers`와 `BlueRoomPlayers`: 가능한 균등 분배 (홀수일 경우 ±1명 차이)

**Business Rules** (from spec.md):
- FR-008: 팀 균등 배분, 홀수일 경우 레드 팀 +1
- FR-009: 대통령 1명(블루), 폭파범 1명(레드) 필수
- FR-010: 각 팀당 스파이 최소 1명 (10명 이상일 때 2명)
- FR-011: 나머지 플레이어는 일반 요원
- FR-013: 빨간 방/파란 방 균등 분배

### 4. Role (역할)

역할은 각 플레이어에게 배정되는 게임 내 역할을 나타냅니다.

```go
type Role struct {
    ID          string    `json:"id"`          // 역할 고유 ID
    Name        string    `json:"name"`        // 역할 이름 (한글)
    Description string    `json:"description"` // 역할 설명
    Team        TeamColor `json:"team"`        // 소속 팀
    IsSpy       bool      `json:"isSpy"`       // 스파이 여부
    IsLeader    bool      `json:"isLeader"`    // 리더 여부 (대통령/폭파범)
}
```

**Predefined Roles**:

```go
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
```

**Business Rules** (from spec.md):
- FR-009: 대통령 1명, 폭파범 1명 필수
- FR-010: 각 팀당 스파이 최소 1명, 10명 이상일 때 각 팀당 2명
- FR-011: 나머지는 일반 요원으로 배정

## Role Distribution Algorithm

게임 시작 시 역할을 배분하는 알고리즘입니다.

```go
func AssignRoles(players []*Player) error {
    if len(players) < 6 {
        return errors.New("최소 6명의 플레이어가 필요합니다")
    }

    // Step 1: 팀 분배 (홀수일 경우 레드 팀 +1)
    halfCount := len(players) / 2
    redCount := halfCount
    blueCount := halfCount
    if len(players)%2 == 1 {
        redCount++ // 홀수일 경우 레드 팀이 1명 더 많음
    }

    // Step 2: 플레이어 섞기
    shuffled := shuffle(players)

    // Step 3: 팀 배정
    redTeam := shuffled[:redCount]
    blueTeam := shuffled[redCount:]

    // Step 4: 스파이 수 결정
    spyCountPerTeam := 1
    if len(players) >= 10 {
        spyCountPerTeam = 2
    }

    // Step 5: 레드 팀 역할 배정
    redTeam[0].Role = &RoleBomber  // 폭파범
    for i := 1; i <= spyCountPerTeam; i++ {
        redTeam[i].Role = &RoleRedSpy  // 스파이
    }
    for i := spyCountPerTeam + 1; i < len(redTeam); i++ {
        redTeam[i].Role = &RoleRedOperative  // 일반 요원
    }

    // Step 6: 블루 팀 역할 배정
    blueTeam[0].Role = &RolePresident  // 대통령
    for i := 1; i <= spyCountPerTeam; i++ {
        blueTeam[i].Role = &RoleBlueSpy  // 스파이
    }
    for i := spyCountPerTeam + 1; i < len(blueTeam); i++ {
        blueTeam[i].Role = &RoleBlueOperative  // 일반 요원
    }

    return nil
}
```

## Room Assignment Algorithm

게임 시작 시 플레이어를 두 방에 배정하는 알고리즘입니다.

```go
func AssignRooms(players []*Player) {
    // Step 1: 플레이어 섞기
    shuffled := shuffle(players)

    // Step 2: 균등 분배
    halfCount := len(shuffled) / 2

    // Step 3: 빨간 방/파란 방 배정
    for i, player := range shuffled {
        if i < halfCount {
            player.CurrentRoom = RedRoom
        } else {
            player.CurrentRoom = BlueRoom
        }
    }
}
```

## In-Memory Storage

모든 데이터는 인메모리에 저장되며, 서버 재시작 시 삭제됩니다.

```go
type RoomStore struct {
    rooms map[string]*Room  // key: room code
    mu    sync.RWMutex
}

func (s *RoomStore) Create(room *Room) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, exists := s.rooms[room.Code]; exists {
        return errors.New("room code already exists")
    }

    s.rooms[room.Code] = room
    return nil
}

func (s *RoomStore) Get(code string) (*Room, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    room, exists := s.rooms[code]
    if !exists {
        return nil, errors.New("room not found")
    }

    return room, nil
}

func (s *RoomStore) Update(room *Room) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, exists := s.rooms[room.Code]; !exists {
        return errors.New("room not found")
    }

    room.UpdatedAt = time.Now()
    s.rooms[room.Code] = room
    return nil
}

func (s *RoomStore) Delete(code string) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    delete(s.rooms, code)
    return nil
}
```

## Validation Summary

| Entity | Field | Validation Rule |
|--------|-------|----------------|
| Player | Nickname | 2-20자, 영문/한글/숫자 |
| Player | ID | UUID v4 |
| Room | Code | 6자리 대문자 영숫자 |
| Room | MaxPlayers | 6-30명 |
| Room | Players | 최소 6명 (게임 시작 시) |
| GameSession | Teams | 균등 분배 (홀수일 경우 RedTeam +1) |
| GameSession | Rooms | 균등 분배 (홀수일 경우 ±1명) |
| Role | President | 정확히 1명, 블루 팀 |
| Role | Bomber | 정확히 1명, 레드 팀 |
| Role | Spies | 각 팀당 1-2명 (플레이어 수에 따라) |

## Error Handling

```go
var (
    ErrRoomNotFound        = errors.New("room not found")
    ErrRoomCodeExists      = errors.New("room code already exists")
    ErrInvalidNickname     = errors.New("invalid nickname")
    ErrMinimumPlayers      = errors.New("minimum 6 players required")
    ErrPlayerNotFound      = errors.New("player not found")
    ErrNotRoomOwner        = errors.New("only room owner can start game")
    ErrGameAlreadyStarted  = errors.New("game already started")
)
```
