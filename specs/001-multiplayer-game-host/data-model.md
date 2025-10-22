# Data Model: 멀티플레이어 게임 진행 시스템

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)
**Created**: 2025-10-22 | **Phase**: 1 (Design)

## Overview

이 문서는 "두개의 방, 한개의 폭탄" 게임 시스템의 핵심 데이터 모델을 정의합니다. spec.md의 Key Entities 섹션을 기반으로 작성되었으며, 인메모리 저장소에서 관리되는 도메인 모델을 설명합니다.

## Core Entities

### 1. Player (플레이어)

플레이어는 게임에 참여하는 개별 사용자를 나타냅니다.

```go
type Player struct {
    ID          string    `json:"id"`           // UUID
    Nickname    string    `json:"nickname"`     // 사용자 닉네임 (2-20자)
    IsAnonymous bool      `json:"isAnonymous"`  // 익명 닉네임 여부
    RoomCode    string    `json:"roomCode"`     // 속한 방 코드
    Role        *Role     `json:"role"`         // 할당된 역할 (게임 시작 후)
    Team        TeamColor `json:"team"`         // 소속 팀 (RED/BLUE)
    CurrentRoom RoomColor `json:"currentRoom"`  // 현재 위치한 방 (RED_ROOM/BLUE_ROOM)
    IsLeader    bool      `json:"isLeader"`     // 리더 여부 (각 방의 리더)
    IsHostage   bool      `json:"isHostage"`    // 현재 인질 여부
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
- `IsLeader`: 각 방(RED_ROOM/BLUE_ROOM)마다 정확히 1명

**Business Rules** (from spec.md FR-021 ~ FR-025):
- 플레이어 입장 시 자동으로 익명 닉네임 부여 (예: "플레이어1")
- 대기실에서 닉네임 변경 가능
- 닉네임 중복 시 자동으로 숫자 추가 (예: "홍길동" → "홍길동2")
- 게임 시작 시 팀 자동 균등 분배 (FR-007)
- 라운드 시작 시 방 자동 균등 분배 (FR-011)

### 2. Room (게임 방)

게임 방은 플레이어들이 게임을 진행하는 세션입니다.

```go
type Room struct {
    Code                  string                `json:"code"`                  // 6자리 고유 코드 (예: "ABC123")
    Status                RoomStatus            `json:"status"`                // 방 상태
    Players               []*Player             `json:"players"`               // 참가자 목록
    MaxPlayers            int                   `json:"maxPlayers"`            // 최대 인원 (6-30명)
    RoundCount            int                   `json:"roundCount"`            // 라운드 수 (3-7, 기본값: 5) FR-020
    RoundDuration         int                   `json:"roundDuration"`         // 라운드 시간(초) (60-600, 기본값: 180) FR-020
    HostageExchangePattern HostageExchangePattern `json:"hostageExchangePattern"` // 인질 교환 패턴 (기본값: GRADUAL) FR-012
    GameSession           *GameSession          `json:"gameSession"`           // 게임 세션 (게임 시작 후)
    CreatedAt             time.Time             `json:"createdAt"`             // 생성 시각
    UpdatedAt             time.Time             `json:"updatedAt"`             // 최종 업데이트 시각
}

type HostageExchangePattern string
const (
    HostageExchangeFixed    HostageExchangePattern = "FIXED"    // 고정: 모든 라운드 1명
    HostageExchangeGradual  HostageExchangePattern = "GRADUAL"  // 점진적: R1-2→1명, R3-4→2명, R5+→3명 (기본값)
    HostageExchangeLateGame HostageExchangePattern = "LATE_GAME" // 후반 집중: R1-3→1명, R4-5→2명
)

type RoomStatus string
const (
    RoomStatusWaiting    RoomStatus = "WAITING"     // 대기 중
    RoomStatusInProgress RoomStatus = "IN_PROGRESS" // 게임 진행 중
    RoomStatusEnded      RoomStatus = "ENDED"       // 게임 종료
)
```

**Validation Rules**:
- `Code`: 6자리 대문자 영숫자, 전역 고유
- `MaxPlayers`: 6 이상 30 이하 (짝수 권장, FR-007)
- `RoundCount`: 3 이상 7 이하 (기본값: 5, FR-020)
- `RoundDuration`: 60 이상 600 이하 초 단위 (기본값: 180초 = 3분, FR-020)
- `HostageExchangePattern`: FIXED, GRADUAL, LATE_GAME 중 하나 (기본값: GRADUAL, FR-012)
- `Players`: 최소 6명부터 게임 시작 가능 (FR-003)
- 게임 시작 시 `Status`는 `WAITING` → `IN_PROGRESS`

**Business Rules** (from spec.md):
- FR-001: 방 생성 시 고유 코드 자동 생성
- FR-002: 생성 후 3초 이내 응답
- FR-003: 6명 이상일 때만 게임 시작 가능
- FR-004: 게임 진행 중 신규 입장 불가
- FR-020: 방장은 게임 시작 전 라운드 설정 조정 가능 (라운드 수, 각 라운드 시간)

**Lifecycle**:
```
WAITING → IN_PROGRESS → ENDED
   ↓           ↓
(플레이어 입장) (라운드 진행)
```

### 3. GameSession (게임 세션)

게임 세션은 게임 시작부터 종료까지의 진행 상태를 관리합니다.

```go
type GameSession struct {
    RoomCode      string        `json:"roomCode"`      // 속한 방 코드
    CurrentRound  int           `json:"currentRound"`  // 현재 라운드 (1부터 시작)
    TotalRounds   int           `json:"totalRounds"`   // 총 라운드 수
    RoundState    RoundState    `json:"roundState"`    // 라운드 상태
    Timer         *RoundTimer   `json:"timer"`         // 라운드 타이머
    RedTeam       []*Player     `json:"redTeam"`       // 빨간 팀 플레이어
    BlueTeam      []*Player     `json:"blueTeam"`      // 파란 팀 플레이어
    RedRoomPlayers  []*Player   `json:"redRoomPlayers"`  // 빨간 방 플레이어
    BlueRoomPlayers []*Player   `json:"blueRoomPlayers"` // 파란 방 플레이어
    RedRoomLeader   *Player     `json:"redRoomLeader"`   // 빨간 방 리더
    BlueRoomLeader  *Player     `json:"blueRoomLeader"`  // 파란 방 리더
    HostageHistory  []HostageExchange `json:"hostageHistory"` // 인질 교환 기록
    Result        *GameResult   `json:"result"`        // 게임 결과 (종료 후)
    StartedAt     time.Time     `json:"startedAt"`     // 게임 시작 시각
}

type RoundState string
const (
    RoundStateDiscussion RoundState = "DISCUSSION" // 토론 중
    RoundStateExchange   RoundState = "EXCHANGE"   // 인질 교환 중
    RoundStateEnded      RoundState = "ENDED"      // 라운드 종료
)

type HostageExchange struct {
    Round         int       `json:"round"`         // 라운드 번호
    FromRedRoom   *Player   `json:"fromRedRoom"`   // 빨간 방에서 보낸 인질
    FromBlueRoom  *Player   `json:"fromBlueRoom"`  // 파란 방에서 보낸 인질
    AutoSelected  bool      `json:"autoSelected"`  // 자동 선택 여부 (타임아웃)
    ExchangedAt   time.Time `json:"exchangedAt"`   // 교환 시각
}
```

**Validation Rules**:
- `CurrentRound`: 1 이상, `TotalRounds` 이하
- `TotalRounds`: 게임 규칙에 따라 플레이어 수 기반 계산 (spec.md 참조)
- `RedTeam`과 `BlueTeam`: 각 팀 최소 3명, 가능한 균등 분배
- `RedRoomLeader`, `BlueRoomLeader`: 각 방마다 정확히 1명 (FR-024)

**Business Rules** (from spec.md):
- FR-006: 역할 카드는 팀별 균등 분배 (팀 배분 후)
- FR-007: 플레이어를 빨간 팀/파란 팀으로 균등 배분
- FR-008: 대통령은 파란 팀, 폭파범은 빨간 팀 (항상)
- FR-009: 게임 시작 시 역할 카드 즉시 표시
- FR-011: 라운드 시작 시 플레이어를 두 방으로 균등 배분
- FR-012: 각 방의 플레이어 목록 실시간 표시
- FR-013: 라운드마다 타이머 작동 (분 단위 설정 가능)
- FR-011: 라운드 종료 시 각 방 리더가 인질 선택 인터페이스 제공
- FR-011.1: 인질 선택 제한 시간(60초) 내 미선택 시 자동 무작위 선택
- FR-012: 방장이 설정한 패턴에 따라 라운드별 인질 교환 수 결정
- FR-015: 인질 교환 시 각 방 리더가 인질 선택 (FR-024, FR-025)

**Hostage Exchange Count Logic** (FR-012):
```go
func GetHostageCount(round int, pattern HostageExchangePattern) int {
    switch pattern {
    case HostageExchangeFixed:
        return 1  // 모든 라운드 1명
    case HostageExchangeGradual:  // 기본값 (원본 게임 규칙)
        if round <= 2 {
            return 1  // 라운드 1-2: 1명
        } else if round <= 4 {
            return 2  // 라운드 3-4: 2명
        }
        return 3  // 라운드 5+: 3명
    case HostageExchangeLateGame:
        if round <= 3 {
            return 1  // 라운드 1-3: 1명
        }
        return 2  // 라운드 4-5: 2명
    default:
        return 1
    }
}
```

**Round Lifecycle**:
```
DISCUSSION (타이머 작동) → EXCHANGE (인질 선택) → ENDED (라운드 종료)
    ↓                           ↓
(플레이어 토론)            (방장이 인질 선택)
                                ↓
                        (다음 라운드 또는 게임 종료)
```

### 4. RoundTimer (라운드 타이머)

라운드 타이머는 각 라운드의 시간 제한을 관리합니다.

```go
type RoundTimer struct {
    Duration     int       `json:"duration"`     // 라운드 시간 (초 단위)
    Remaining    int       `json:"remaining"`    // 남은 시간 (초 단위)
    StartedAt    time.Time `json:"startedAt"`    // 타이머 시작 시각
    IsRunning    bool      `json:"isRunning"`    // 타이머 작동 여부
    ticker       *time.Ticker `json:"-"`         // 내부 틱커 (직렬화 제외)
    stopChan     chan bool `json:"-"`            // 정지 채널 (직렬화 제외)
}
```

**Validation Rules**:
- `Duration`: 60 이상 (1분 이상)
- `Remaining`: 0 이상 `Duration` 이하
- `IsRunning`: true일 때만 `ticker` 작동

**Business Rules** (from spec.md):
- FR-013: 라운드마다 타이머 작동, 분 단위 설정 가능
- FR-014: 남은 시간을 모든 플레이어에게 실시간 표시
- SC-002: 타이머 동기화 오차 1초 이하 (모든 플레이어 화면)

**Timer Synchronization**:
- 서버에서 1초마다 `TIMER_UPDATE` 메시지 브로드캐스트
- 클라이언트는 서버 시간 수신 + 로컬 보간으로 부드러운 UI 제공
- `research.md`의 "Timer Synchronization Pattern" 참조

### 5. Role (역할 카드)

역할 카드는 플레이어에게 할당되는 게임 역할을 나타냅니다.

```go
type Role struct {
    ID          string    `json:"id"`          // 역할 고유 ID (PRESIDENT, BOMBER 등)
    Name        string    `json:"name"`        // 역할 이름 (한국어)
    Description string    `json:"description"` // 역할 설명
    Team        TeamColor `json:"team"`        // 소속 팀 (RED/BLUE)
    IsLeader    bool      `json:"isLeader"`    // 리더 여부 (대통령/폭파범)
}
```

**Predefined Roles** (spec.md 참조):
```go
var (
    RolePresident = Role{
        ID:          "PRESIDENT",
        Name:        "대통령",
        Description: "파란 팀의 리더. 폭파범과 같은 방에 있으면 안 됩니다.",
        Team:        TeamBlue,
        IsLeader:    true,
    }

    RoleBomber = Role{
        ID:          "BOMBER",
        Name:        "폭파범",
        Description: "빨간 팀의 리더. 대통령과 같은 방에 있어야 합니다.",
        Team:        TeamRed,
        IsLeader:    true,
    }

    // 추가 역할 카드 (MVP에서는 생략 가능)
    // RoleDoctor, RoleEngineer, RoleSpy 등
)
```

**Validation Rules**:
- 대통령(PRESIDENT)은 항상 파란 팀 (FR-008)
- 폭파범(BOMBER)은 항상 빨간 팀 (FR-008)
- 각 게임마다 정확히 1명의 대통령, 1명의 폭파범

**Business Rules** (from spec.md):
- FR-006: 역할 카드는 팀별로 균등 분배
- FR-009: 게임 시작 시 역할 카드 즉시 표시
- FR-010: 역할 카드는 본인만 확인 가능 (다른 플레이어에게 비공개)

### 6. GameResult (게임 결과)

게임 결과는 게임 종료 시 승패를 기록합니다.

```go
type GameResult struct {
    WinningTeam  TeamColor `json:"winningTeam"`  // 승리 팀 (RED/BLUE)
    Reason       string    `json:"reason"`       // 승리 이유
    FinalRound   int       `json:"finalRound"`   // 종료된 라운드
    President    *Player   `json:"president"`    // 대통령
    Bomber       *Player   `json:"bomber"`       // 폭파범
    PresidentRoom RoomColor `json:"presidentRoom"` // 대통령 최종 위치
    BomberRoom    RoomColor `json:"bomberRoom"`    // 폭파범 최종 위치
    EndedAt      time.Time `json:"endedAt"`      // 게임 종료 시각
}
```

**Validation Rules**:
- `WinningTeam`: TeamRed 또는 TeamBlue
- `Reason`: 승리 조건 설명 (예: "대통령과 폭파범이 같은 방에 있습니다")

**Business Rules** (from spec.md):
- FR-016: 최종 라운드 종료 시 대통령과 폭파범의 위치 확인
- FR-017: 대통령과 폭파범이 **같은 방**이면 빨간 팀(폭파범) 승리
- FR-018: 대통령과 폭파범이 **다른 방**이면 파란 팀(대통령) 승리
- FR-019: 게임 결과를 모든 플레이어에게 동시 표시
- FR-020: 결과 화면에 승리 팀, 대통령/폭파범 역할 공개

**Victory Condition Logic**:
```go
func DetermineWinner(session *GameSession) *GameResult {
    president := findPlayerByRole(session, RolePresident)
    bomber := findPlayerByRole(session, RoleBomber)

    result := &GameResult{
        FinalRound:    session.CurrentRound,
        President:     president,
        Bomber:        bomber,
        PresidentRoom: president.CurrentRoom,
        BomberRoom:    bomber.CurrentRoom,
        EndedAt:       time.Now(),
    }

    if president.CurrentRoom == bomber.CurrentRoom {
        result.WinningTeam = TeamRed
        result.Reason = "대통령과 폭파범이 같은 방에 있습니다. 빨간 팀 승리!"
    } else {
        result.WinningTeam = TeamBlue
        result.Reason = "대통령과 폭파범이 다른 방에 있습니다. 파란 팀 승리!"
    }

    return result
}
```

## Entity Relationships

### ER Diagram (Conceptual)

```
┌─────────────┐
│    Room     │
│ (게임 방)    │
└──────┬──────┘
       │ 1
       │
       │ 1..*
┌──────┴──────┐
│   Player    │
│ (플레이어)   │
└──────┬──────┘
       │ 1
       │
       │ 0..1
┌──────┴──────┐
│    Role     │
│ (역할 카드)  │
└─────────────┘

┌─────────────┐
│    Room     │
└──────┬──────┘
       │ 1
       │
       │ 0..1
┌──────┴──────────┐
│  GameSession    │
│  (게임 세션)     │
└──────┬──────────┘
       │ 1
       │
       │ 1
┌──────┴──────────┐
│  RoundTimer     │
│  (라운드 타이머) │
└─────────────────┘

┌──────────────────┐
│   GameSession    │
└──────┬───────────┘
       │ 1
       │
       │ 0..1
┌──────┴───────────┐
│   GameResult     │
│   (게임 결과)     │
└──────────────────┘
```

### Relationship Rules

1. **Room ↔ Player**: 1:N (한 방에 여러 플레이어)
   - 플레이어는 정확히 1개 방에 속함 (`Player.RoomCode`)
   - 방은 0명 이상의 플레이어 포함 (`Room.Players`)
   - 게임 시작 시 최소 6명 필요 (FR-003)

2. **Player ↔ Role**: 1:0..1 (플레이어는 0개 또는 1개 역할 보유)
   - 게임 시작 전: `Player.Role == nil`
   - 게임 시작 후: 모든 플레이어에게 역할 할당

3. **Room ↔ GameSession**: 1:0..1 (방은 0개 또는 1개 게임 세션 보유)
   - 대기 중: `Room.GameSession == nil`
   - 게임 진행 중/종료: `Room.GameSession != nil`

4. **GameSession ↔ RoundTimer**: 1:1 (게임 세션마다 1개 타이머)
   - 게임 세션 생성 시 타이머 자동 생성
   - 라운드마다 타이머 리셋

5. **GameSession ↔ GameResult**: 1:0..1 (게임 세션은 0개 또는 1개 결과 보유)
   - 게임 진행 중: `GameSession.Result == nil`
   - 게임 종료 후: `GameSession.Result != nil`

6. **GameSession ↔ Player (Leaders)**: 1:2 (게임 세션마다 2명의 방장)
   - `GameSession.RedRoomLeader`: 빨간 방 방장 (1명)
   - `GameSession.BlueRoomLeader`: 파란 방 방장 (1명)
   - 방장은 인질 교환 권한 보유 (FR-015)

## Data Flow

### 1. 방 생성 및 플레이어 입장

```
[사용자 요청] → [RoomService.CreateRoom]
                    ↓
                [Room 생성]
                    ↓
                [고유 코드 생성]
                    ↓
                [RoomStore 저장]
                    ↓
                [방 코드 반환]

[플레이어 입장] → [PlayerService.JoinRoom]
                    ↓
                [Room 조회]
                    ↓
                [Player 생성 (익명 닉네임)]
                    ↓
                [Room.Players 추가]
                    ↓
                [WebSocket 연결 등록]
                    ↓
                [모든 플레이어에게 PLAYER_JOINED 브로드캐스트]
```

### 2. 게임 시작 및 역할 배분

```
[방장 게임 시작] → [GameService.StartGame]
                    ↓
                [플레이어 수 검증 (>= 6명)]
                    ↓
                [GameSession 생성]
                    ↓
                [팀 배분 (RED/BLUE 균등)]
                    ↓
                [역할 카드 배분]
                    ↓
                [Room.Status = IN_PROGRESS]
                    ↓
                [모든 플레이어에게 GAME_STARTED 브로드캐스트]
                    ↓
                [각 플레이어에게 ROLE_ASSIGNED 개별 전송]
```

### 3. 라운드 진행 및 타이머

```
[라운드 시작] → [GameService.StartRound]
                    ↓
                [플레이어를 RED_ROOM/BLUE_ROOM 균등 배분]
                    ↓
                [각 방마다 방장 지정]
                    ↓
                [RoundTimer 시작]
                    ↓
                [1초마다 TIMER_UPDATE 브로드캐스트]
                    ↓
                [타이머 종료 → RoundState = EXCHANGE]
                    ↓
                [방장 인질 선택 대기]
```

### 4. 인질 교환 및 라운드 종료

```
[방장 인질 선택] → [GameService.SelectHostage]
                    ↓
                [빨간 방/파란 방 방장 검증]
                    ↓
                [인질 2명 선택 대기]
                    ↓
                [양쪽 인질 선택 완료]
                    ↓
                [HostageExchange 기록 저장]
                    ↓
                [인질 방 이동 (RED_ROOM ↔ BLUE_ROOM)]
                    ↓
                [모든 플레이어에게 HOSTAGE_EXCHANGED 브로드캐스트]
                    ↓
                [다음 라운드 시작 또는 게임 종료]
```

### 5. 게임 종료 및 결과 판정

```
[최종 라운드 종료] → [GameService.EndGame]
                    ↓
                [대통령/폭파범 위치 확인]
                    ↓
                [승리 팀 판정]
                    ↓
                [GameResult 생성]
                    ↓
                [Room.Status = ENDED]
                    ↓
                [모든 플레이어에게 GAME_ENDED 브로드캐스트]
                    ↓
                [결과 화면 표시]
```

## Storage Layer

### In-Memory Store Implementation

```go
// RoomStore: Thread-safe 인메모리 방 저장소
type RoomStore struct {
    mu    sync.RWMutex
    rooms map[string]*Room // key: Room.Code
}

func (s *RoomStore) Create(room *Room) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, exists := s.rooms[room.Code]; exists {
        return ErrRoomAlreadyExists
    }
    s.rooms[room.Code] = room
    return nil
}

func (s *RoomStore) Get(code string) (*Room, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    room, exists := s.rooms[code]
    if !exists {
        return nil, ErrRoomNotFound
    }
    return room, nil
}

func (s *RoomStore) Update(room *Room) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, exists := s.rooms[room.Code]; !exists {
        return ErrRoomNotFound
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

func (s *RoomStore) List() []*Room {
    s.mu.RLock()
    defer s.mu.RUnlock()

    rooms := make([]*Room, 0, len(s.rooms))
    for _, room := range s.rooms {
        rooms = append(rooms, room)
    }
    return rooms
}
```

**Concurrency Considerations**:
- `sync.RWMutex` 사용으로 읽기 성능 최적화
- 각 방(Room)은 독립적으로 잠금 (방 간 경합 최소화)
- WebSocket Hub는 별도 고루틴에서 실행 (research.md 참조)

## Validation & Constraints

### Data Integrity Rules

1. **Nickname Uniqueness** (FR-023):
   ```go
   func (s *RoomService) EnsureUniqueNickname(roomCode, nickname string) string {
       room, _ := s.store.Get(roomCode)
       uniqueNickname := nickname
       suffix := 2

       for {
           duplicate := false
           for _, player := range room.Players {
               if player.Nickname == uniqueNickname {
                   duplicate = true
                   break
               }
           }
           if !duplicate {
               break
           }
           uniqueNickname = fmt.Sprintf("%s%d", nickname, suffix)
           suffix++
       }
       return uniqueNickname
   }
   ```

2. **Team Balance** (FR-007):
   ```go
   func AssignTeams(players []*Player) {
       // 플레이어를 RED/BLUE 팀으로 균등 배분
       halfSize := len(players) / 2
       rand.Shuffle(len(players), func(i, j int) {
           players[i], players[j] = players[j], players[i]
       })

       for i, player := range players {
           if i < halfSize {
               player.Team = TeamRed
           } else {
               player.Team = TeamBlue
           }
       }
   }
   ```

3. **Room Balance** (FR-011):
   ```go
   func AssignRooms(players []*Player) {
       // 플레이어를 RED_ROOM/BLUE_ROOM으로 균등 배분
       halfSize := len(players) / 2
       rand.Shuffle(len(players), func(i, j int) {
           players[i], players[j] = players[j], players[i]
       })

       for i, player := range players {
           if i < halfSize {
               player.CurrentRoom = RedRoom
           } else {
               player.CurrentRoom = BlueRoom
           }
       }
   }
   ```

4. **Leader Assignment** (FR-024):
   ```go
   func AssignLeaders(session *GameSession) {
       // 각 방의 첫 번째 플레이어를 방장으로 지정
       if len(session.RedRoomPlayers) > 0 {
           session.RedRoomLeader = session.RedRoomPlayers[0]
           session.RedRoomLeader.IsLeader = true
       }
       if len(session.BlueRoomPlayers) > 0 {
           session.BlueRoomLeader = session.BlueRoomPlayers[0]
           session.BlueRoomLeader.IsLeader = true
       }
   }
   ```

## Edge Cases

### 1. 방장 퇴장 (from spec.md Edge Cases)

**시나리오**: 방장이 게임 중 연결 끊김

**처리 방법**:
```go
func (s *GameService) HandleLeaderDisconnect(session *GameSession, leader *Player) {
    var room []*Player
    if leader == session.RedRoomLeader {
        room = session.RedRoomPlayers
    } else {
        room = session.BlueRoomPlayers
    }

    // 방에서 해당 플레이어 제거
    room = removePlayer(room, leader)

    // 남은 플레이어 중 첫 번째를 새 방장으로 지정
    if len(room) > 0 {
        newLeader := room[0]
        newLeader.IsLeader = true

        if leader == session.RedRoomLeader {
            session.RedRoomLeader = newLeader
        } else {
            session.BlueRoomLeader = newLeader
        }

        // 모든 플레이어에게 알림
        s.hub.BroadcastToRoom(session.RoomCode, LeaderChangedMessage{
            NewLeader: newLeader,
        })
    } else {
        // 방에 플레이어가 없으면 게임 종료
        s.EndGameEarly(session, "플레이어 부족으로 게임 종료")
    }
}
```

### 2. 닉네임 중복 (from spec.md Edge Cases)

**시나리오**: "홍길동" 닉네임 이미 사용 중

**처리 방법**: `EnsureUniqueNickname()` 함수로 자동 처리
- "홍길동" → "홍길동2"
- "홍길동2" → "홍길동3"
- ...

### 3. 홀수 플레이어 (from spec.md Edge Cases)

**시나리오**: 7명의 플레이어 (홀수)

**처리 방법**:
```go
func AssignTeams(players []*Player) {
    halfSize := len(players) / 2
    // 7명 → halfSize = 3
    // RED: 3명, BLUE: 4명 (1명 차이)

    // 인질 교환 시 방 배분도 동일 로직
    // RED_ROOM: 3명, BLUE_ROOM: 4명
}
```

**결과**: 최대 1명 차이로 균등 배분 (허용됨)

## TypeScript Type Definitions (Frontend)

프론트엔드에서 사용할 타입 정의:

```typescript
// types/game.types.ts

export enum TeamColor {
  RED = 'RED',
  BLUE = 'BLUE',
}

export enum RoomColor {
  RED_ROOM = 'RED_ROOM',
  BLUE_ROOM = 'BLUE_ROOM',
}

export enum RoomStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  ENDED = 'ENDED',
}

export enum RoundState {
  DISCUSSION = 'DISCUSSION',
  EXCHANGE = 'EXCHANGE',
  ENDED = 'ENDED',
}

export interface Role {
  id: string;
  name: string;
  description: string;
  team: TeamColor;
  isLeader: boolean;
}

export interface Player {
  id: string;
  nickname: string;
  isAnonymous: boolean;
  roomCode: string;
  role: Role | null;
  team: TeamColor;
  currentRoom: RoomColor;
  isLeader: boolean;
  isHostage: boolean;
  connectedAt: string; // ISO 8601 timestamp
}

export interface Room {
  code: string;
  status: RoomStatus;
  players: Player[];
  maxPlayers: number;
  gameSession: GameSession | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoundTimer {
  duration: number;
  remaining: number;
  startedAt: string;
  isRunning: boolean;
}

export interface HostageExchange {
  round: number;
  fromRedRoom: Player;
  fromBlueRoom: Player;
  exchangedAt: string;
}

export interface GameResult {
  winningTeam: TeamColor;
  reason: string;
  finalRound: number;
  president: Player;
  bomber: Player;
  presidentRoom: RoomColor;
  bomberRoom: RoomColor;
  endedAt: string;
}

export interface GameSession {
  roomCode: string;
  currentRound: number;
  totalRounds: number;
  roundState: RoundState;
  timer: RoundTimer;
  redTeam: Player[];
  blueTeam: Player[];
  redRoomPlayers: Player[];
  blueRoomPlayers: Player[];
  redRoomLeader: Player;
  blueRoomLeader: Player;
  hostageHistory: HostageExchange[];
  result: GameResult | null;
  startedAt: string;
}
```

## Summary

이 데이터 모델은:
- ✅ spec.md의 모든 Key Entities 반영
- ✅ 25개 Functional Requirements 지원
- ✅ 10개 Success Criteria 달성 가능
- ✅ Edge Cases 처리 로직 포함
- ✅ 헌법 원칙 II (TDD) 준수 - 테스트 가능한 구조
- ✅ 헌법 원칙 V (단순성) 준수 - 복잡한 추상화 없음

**다음 단계**: API contracts (OpenAPI 3.0 specification) 생성
