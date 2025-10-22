# Tasks: 멀티플레이어 게임 진행 시스템

**Input**: Design documents from `/specs/001-multiplayer-game-host/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-spec.yaml
**Generated**: 2025-10-22

**Tests**: 헌법 원칙 II (TDD)에 따라 모든 구현 전에 테스트 작성 필수

**Organization**: 작업은 사용자 스토리별로 그룹화되어 각 스토리를 독립적으로 구현 및 테스트할 수 있습니다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 이 작업이 속한 사용자 스토리 (예: US1, US2, US3)
- 설명에 정확한 파일 경로 포함

## Path Conventions

프로젝트는 **웹 애플리케이션** 구조 (plan.md 참조):
- Backend: `backend/` (Go 1.21+, Gin, Gorilla WebSocket)
- Frontend: `frontend/` (React 18+, TypeScript, Vite)
- Tests:
  - Backend: `backend/tests/unit/`, `backend/tests/integration/`
  - Frontend: `frontend/src/components/__tests__/`, `frontend/src/pages/__tests__/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 초기화 및 기본 구조 생성

- [ ] T001 Create backend directory structure (cmd/server, internal/models, internal/services, internal/handlers, internal/websocket, tests/)
- [ ] T002 [P] Initialize Go module (go mod init) in backend/ with Gin and Gorilla WebSocket dependencies
- [ ] T003 [P] Create frontend directory structure with Vite React TypeScript template
- [ ] T004 [P] Configure backend linting (golangci-lint) and formatting (gofmt)
- [ ] T005 [P] Configure frontend linting (ESLint) and formatting (Prettier) in frontend/
- [ ] T006 [P] Setup CORS configuration for development in backend/cmd/server/main.go
- [ ] T007 [P] Create environment configuration files (.env.example) for backend and frontend

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 사용자 스토리가 의존하는 핵심 인프라 구현. 이 Phase가 완료되어야 사용자 스토리 작업 시작 가능.

**⚠️ CRITICAL**: 이 Phase가 완료되기 전에는 어떤 사용자 스토리도 시작할 수 없음

### 백엔드 기초 인프라

- [ ] T008 **TEST FIRST**: Create unit test for room code generation in backend/internal/services/room_service_test.go
- [ ] T009 Implement room code generation function in backend/internal/services/room_service.go (6-digit alphanumeric, unique)
- [ ] T010 **TEST FIRST**: Create unit test for in-memory room store CRUD operations in backend/internal/store/room_store_test.go
- [ ] T011 Implement thread-safe in-memory room store in backend/internal/store/room_store.go (sync.RWMutex)
- [ ] T012 [P] Define core domain models (Player, Room, RoomStatus, TeamColor, RoomColor) in backend/internal/models/player.go and backend/internal/models/room.go
- [ ] T013 [P] Define game domain models (GameSession, RoundTimer, Role, GameResult, RoundState, HostageExchange) in backend/internal/models/game_session.go
- [ ] T014 [P] Create error types and constants in backend/internal/models/errors.go
- [ ] T015 [P] Setup Gin router with health check endpoint in backend/cmd/server/main.go
- [ ] T016 **TEST FIRST**: Create WebSocket Hub test in backend/internal/websocket/hub_test.go
- [ ] T017 Implement WebSocket Hub with register/unregister/broadcast channels in backend/internal/websocket/hub.go
- [ ] T017.1 **TEST FIRST**: Create player reconnection logic test in backend/internal/websocket/hub_test.go (30-second grace period)
- [ ] T017.2 Implement player reconnection logic (30-second grace period) in backend/internal/websocket/hub.go
- [ ] T018 [P] **TEST FIRST**: Create WebSocket Client test in backend/internal/websocket/client_test.go
- [ ] T019 [P] Implement WebSocket Client with read/write pumps in backend/internal/websocket/client.go
- [ ] T020 Create WebSocket message types and serialization in backend/internal/websocket/messages.go

### 프론트엔드 기초 인프라

- [ ] T021 [P] Define TypeScript types for all domain models in frontend/src/types/game.types.ts (Player, Room, GameSession, etc.)
- [ ] T022 [P] Create API client base configuration with fetch wrapper in frontend/src/services/api.ts
- [ ] T023 [P] **TEST FIRST**: Create useWebSocket hook test in frontend/src/hooks/__tests__/useWebSocket.test.ts
- [ ] T024 [P] Implement useWebSocket custom hook in frontend/src/hooks/useWebSocket.ts
- [ ] T025 [P] Setup React Router with routes (/, /lobby/:roomCode, /game/:roomCode) in frontend/src/App.tsx
- [ ] T026 [P] Create layout components (Header, Footer) in frontend/src/components/Layout.tsx

**Checkpoint**: Foundation ready - 사용자 스토리 구현 시작 가능

---

## Phase 3: User Story 1 - 방 생성 및 플레이어 입장 (Priority: P1) 🎯 MVP

**Goal**: 방장이 게임 방을 생성하고 플레이어들이 방 코드로 입장하여 대기실에서 서로를 확인할 수 있다.

**Independent Test**: 방장이 방을 생성하고 방 코드를 받아 다른 기기에서 해당 코드로 입장하여 플레이어 목록에 표시되는지 확인. 최소 2명의 플레이어가 동일한 대기실에 있으면 성공.

### 백엔드 Tests for US1 (TDD - 먼저 작성)

- [ ] T027 [P] [US1] **TEST FIRST**: Contract test for POST /api/v1/rooms in backend/tests/integration/room_handler_test.go
- [ ] T028 [P] [US1] **TEST FIRST**: Contract test for GET /api/v1/rooms/{roomCode} in backend/tests/integration/room_handler_test.go
- [ ] T029 [P] [US1] **TEST FIRST**: Contract test for POST /api/v1/rooms/{roomCode}/players in backend/tests/integration/player_handler_test.go
- [ ] T030 [P] [US1] **TEST FIRST**: Contract test for PATCH /api/v1/rooms/{roomCode}/players/{playerId}/nickname in backend/tests/integration/player_handler_test.go
- [ ] T031 [P] [US1] **TEST FIRST**: Unit test for RoomService.CreateRoom in backend/internal/services/room_service_test.go
- [ ] T032 [P] [US1] **TEST FIRST**: Unit test for PlayerService.JoinRoom with auto nickname in backend/internal/services/player_service_test.go
- [ ] T033 [P] [US1] **TEST FIRST**: Unit test for PlayerService.UpdateNickname with uniqueness check in backend/internal/services/player_service_test.go
- [ ] T034 [P] [US1] **TEST FIRST**: Integration test for WebSocket PLAYER_JOINED broadcast in backend/tests/integration/websocket_test.go

### 백엔드 Implementation for US1

- [ ] T035 [US1] Implement RoomService.CreateRoom (generate code, validate maxPlayers, save to store) in backend/internal/services/room_service.go
- [ ] T036 [US1] Implement RoomService.GetRoom (retrieve by code) in backend/internal/services/room_service.go
- [ ] T037 [US1] Implement PlayerService.JoinRoom (create player with auto nickname, add to room, FR-021) in backend/internal/services/player_service.go
- [ ] T038 [US1] Implement PlayerService.UpdateNickname (validate, ensure uniqueness FR-023) in backend/internal/services/player_service.go
- [ ] T039 [US1] Implement nickname generation and uniqueness utilities in backend/internal/services/player_service.go
- [ ] T040 [US1] Create POST /api/v1/rooms handler in backend/internal/handlers/room_handler.go
- [ ] T041 [US1] Create GET /api/v1/rooms/{roomCode} handler in backend/internal/handlers/room_handler.go
- [ ] T042 [US1] Create POST /api/v1/rooms/{roomCode}/players handler in backend/internal/handlers/player_handler.go
- [ ] T043 [US1] Create PATCH /api/v1/rooms/{roomCode}/players/{playerId}/nickname handler in backend/internal/handlers/player_handler.go
- [ ] T044 [US1] Create WebSocket /ws/{roomCode} handler in backend/internal/handlers/websocket_handler.go
- [ ] T045 [US1] Implement PLAYER_JOINED broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T046 [US1] Implement PLAYER_LEFT broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T047 [US1] Implement NICKNAME_CHANGED broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T048 [US1] Wire all US1 routes to Gin router in backend/cmd/server/main.go
- [ ] T048.1 [US1] Add roundCount and roundDuration fields to Room model in backend/internal/models/room.go (FR-020)
- [ ] T048.2 [US1] Add validation for round settings (roundCount: 3-7, roundDuration: 60-600 seconds) in backend/internal/services/room_service.go (FR-020)
- [ ] T048.3 [US1] Add PATCH /api/v1/rooms/{roomCode}/settings endpoint for updating round settings in backend/internal/handlers/room_handler.go (FR-020)

### 프론트엔드 Tests for US1 (TDD - 먼저 작성)

- [ ] T049 [P] [US1] **TEST FIRST**: Test HomePage component rendering in frontend/src/pages/__tests__/HomePage.test.tsx
- [ ] T050 [P] [US1] **TEST FIRST**: Test LobbyPage component with player list in frontend/src/pages/__tests__/LobbyPage.test.tsx
- [ ] T051 [P] [US1] **TEST FIRST**: Test RoomCodeInput component in frontend/src/components/__tests__/RoomCodeInput.test.tsx
- [ ] T052 [P] [US1] **TEST FIRST**: Test PlayerList component in frontend/src/components/__tests__/PlayerList.test.tsx
- [ ] T053 [P] [US1] **TEST FIRST**: Test NicknameEditor component in frontend/src/components/__tests__/NicknameEditor.test.tsx

### 프론트엔드 Implementation for US1

- [ ] T054 [P] [US1] Implement createRoom API function in frontend/src/services/api.ts
- [ ] T055 [P] [US1] Implement getRoom API function in frontend/src/services/api.ts
- [ ] T056 [P] [US1] Implement joinRoom API function in frontend/src/services/api.ts
- [ ] T057 [P] [US1] Implement updateNickname API function in frontend/src/services/api.ts
- [ ] T058 [US1] Create HomePage with "방 만들기" and "방 참가" buttons in frontend/src/pages/HomePage.tsx
- [ ] T059 [US1] Create RoomCodeInput component for entering room code in frontend/src/components/RoomCodeInput.tsx
- [ ] T060 [US1] Create LobbyPage with player list and WebSocket connection in frontend/src/pages/LobbyPage.tsx
- [ ] T061 [US1] Create PlayerList component showing all players in room in frontend/src/components/PlayerList.tsx
- [ ] T062 [US1] Create NicknameEditor component for editing own nickname in frontend/src/components/NicknameEditor.tsx
- [ ] T063 [US1] Integrate PLAYER_JOINED/PLAYER_LEFT/NICKNAME_CHANGED WebSocket messages in frontend/src/pages/LobbyPage.tsx
- [ ] T064 [US1] Add error handling for room not found and game in progress in frontend/src/pages/LobbyPage.tsx
- [ ] T064.1 [P] [US1] Create RoundSettings component for configuring rounds in frontend/src/components/RoundSettings.tsx (FR-020)
- [ ] T064.2 [US1] Integrate RoundSettings component into LobbyPage (visible only to room leader) in frontend/src/pages/LobbyPage.tsx (FR-020)
- [ ] T064.3 [US1] Add updateRoomSettings API function in frontend/src/services/api.ts (FR-020)

**Checkpoint**: User Story 1 완료 - 방 생성, 플레이어 입장, 닉네임 변경, 라운드 설정 기능 동작 확인

---

## Phase 4: User Story 2 - 역할 카드 배분 및 확인 (Priority: P2)

**Goal**: 게임 시작 시 각 플레이어에게 역할 카드(대통령, 폭파범, 일반)가 자동 배분되고, 플레이어는 자신의 역할만 확인할 수 있다.

**Independent Test**: 게임 시작 후 각 플레이어가 자신의 역할 카드를 확인하고, 레드 팀과 블루 팀이 균등 분배되었는지, 대통령과 폭파범이 정확히 한 명씩 존재하는지 검증.

### 백엔드 Tests for US2 (TDD - 먼저 작성)

- [ ] T065 [P] [US2] **TEST FIRST**: Contract test for POST /api/v1/rooms/{roomCode}/game/start in backend/tests/integration/game_handler_test.go
- [ ] T066 [P] [US2] **TEST FIRST**: Unit test for GameService.StartGame with team assignment in backend/internal/services/game_service_test.go
- [ ] T067 [P] [US2] **TEST FIRST**: Unit test for role distribution (1 president, 1 bomber) in backend/internal/services/game_service_test.go
- [ ] T068 [P] [US2] **TEST FIRST**: Unit test for team balance (RED/BLUE equal split) in backend/internal/services/game_service_test.go
- [ ] T069 [P] [US2] **TEST FIRST**: Integration test for GAME_STARTED and ROLE_ASSIGNED WebSocket messages in backend/tests/integration/websocket_test.go

### 백엔드 Implementation for US2

- [ ] T070 [US2] Define predefined roles (RolePresident, RoleBomber, RoleGeneral) in backend/internal/models/role.go
- [ ] T071 [US2] Implement team assignment algorithm (AssignTeams - FR-007) in backend/internal/services/game_service.go
- [ ] T072 [US2] Implement role distribution algorithm (FR-006, FR-008: President=RED, Bomber=BLUE) in backend/internal/services/game_service.go
- [ ] T073 [US2] Implement GameService.StartGame (validate >=6 players, create session, assign teams, assign roles) in backend/internal/services/game_service.go
- [ ] T074 [US2] Create POST /api/v1/rooms/{roomCode}/game/start handler in backend/internal/handlers/game_handler.go
- [ ] T075 [US2] Implement GAME_STARTED broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T076 [US2] Implement ROLE_ASSIGNED unicast (to individual player) in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T077 [US2] Wire US2 routes to Gin router in backend/cmd/server/main.go

### 프론트엔드 Tests for US2 (TDD - 먼저 작성)

- [ ] T078 [P] [US2] **TEST FIRST**: Test RoleCard component displaying role in frontend/src/components/__tests__/RoleCard.test.tsx
- [ ] T079 [P] [US2] **TEST FIRST**: Test LobbyPage "게임 시작" button (only for room leader, >=6 players) in frontend/src/pages/__tests__/LobbyPage.test.tsx
- [ ] T080 [P] [US2] **TEST FIRST**: Test GamePage component initialization in frontend/src/pages/__tests__/GamePage.test.tsx

### 프론트엔드 Implementation for US2

- [ ] T081 [P] [US2] Implement startGame API function in frontend/src/services/api.ts
- [ ] T082 [US2] Add "게임 시작" button to LobbyPage (only shown to room leader, enabled when >=6 players) in frontend/src/pages/LobbyPage.tsx
- [ ] T083 [US2] Create RoleCard component for displaying player's role in frontend/src/components/RoleCard.tsx
- [ ] T084 [US2] Create GamePage with role card display in frontend/src/pages/GamePage.tsx
- [ ] T085 [US2] Integrate GAME_STARTED WebSocket message (navigate to game page) in frontend/src/pages/LobbyPage.tsx
- [ ] T086 [US2] Integrate ROLE_ASSIGNED WebSocket message (display role card) in frontend/src/pages/GamePage.tsx
- [ ] T087 [US2] Add state management for game session in frontend/src/hooks/useGame.ts

**Checkpoint**: User Story 2 완료 - 게임 시작, 팀 배분, 역할 배분 기능 동작 확인

---

## Phase 5: User Story 3 - 라운드 타이머 및 게임 진행 (Priority: P3)

**Goal**: 게임은 여러 라운드로 진행되며, 각 라운드마다 제한 시간이 표시되고 자동으로 다음 라운드로 전환된다.

**Independent Test**: 게임 시작 후 라운드 1의 타이머가 시작되고, 시간이 종료되면 자동으로 라운드 2로 전환되며, 모든 플레이어 화면에 동기화된 타이머가 표시되는지 확인.

### 백엔드 Tests for US3 (TDD - 먼저 작성)

- [ ] T088 [P] [US3] **TEST FIRST**: Contract test for POST /api/v1/rooms/{roomCode}/game/rounds/{roundNumber}/start in backend/tests/integration/game_handler_test.go
- [ ] T089 [P] [US3] **TEST FIRST**: Unit test for RoundTimer start/stop/tick in backend/internal/models/round_timer_test.go
- [ ] T090 [P] [US3] **TEST FIRST**: Unit test for GameService.StartRound in backend/internal/services/game_service_test.go
- [ ] T091 [P] [US3] **TEST FIRST**: Integration test for TIMER_UPDATE broadcast (every 1 second) in backend/tests/integration/websocket_test.go
- [ ] T092 [P] [US3] **TEST FIRST**: Integration test for automatic round transition in backend/tests/integration/game_service_test.go

### 백엔드 Implementation for US3

- [ ] T093 [US3] Implement RoundTimer with ticker and stopChan in backend/internal/models/round_timer.go
- [ ] T094 [US3] Implement GameService.StartRound (set duration, create timer, broadcast ROUND_STARTED) in backend/internal/services/game_service.go
- [ ] T095 [US3] Implement GameService.OnTimerTick (broadcast TIMER_UPDATE every second) in backend/internal/services/game_service.go
- [ ] T096 [US3] Implement GameService.OnRoundEnd (transition to next round or end game) in backend/internal/services/game_service.go
- [ ] T097 [US3] Create POST /api/v1/rooms/{roomCode}/game/rounds/{roundNumber}/start handler in backend/internal/handlers/game_handler.go
- [ ] T098 [US3] Implement TIMER_UPDATE broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T099 [US3] Implement ROUND_STARTED broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T100 [US3] Wire US3 routes to Gin router in backend/cmd/server/main.go

### 프론트엔드 Tests for US3 (TDD - 먼저 작성)

- [ ] T101 [P] [US3] **TEST FIRST**: Test Timer component counts down in frontend/src/components/__tests__/Timer.test.tsx
- [ ] T102 [P] [US3] **TEST FIRST**: Test RoundInfo component displays current round in frontend/src/components/__tests__/RoundInfo.test.tsx
- [ ] T103 [P] [US3] **TEST FIRST**: Test GamePage handles TIMER_UPDATE messages in frontend/src/pages/__tests__/GamePage.test.tsx

### 프론트엔드 Implementation for US3

- [ ] T104 [P] [US3] Implement startRound API function in frontend/src/services/api.ts
- [ ] T105 [US3] Create Timer component with countdown display in frontend/src/components/Timer.tsx
- [ ] T106 [US3] Create RoundInfo component showing round number in frontend/src/components/RoundInfo.tsx
- [ ] T107 [US3] Integrate ROUND_STARTED WebSocket message (display timer, round info) in frontend/src/pages/GamePage.tsx
- [ ] T108 [US3] Integrate TIMER_UPDATE WebSocket message (update timer state) in frontend/src/pages/GamePage.tsx
- [ ] T109 [US3] Implement client-side timer interpolation for smooth UI in frontend/src/components/Timer.tsx
- [ ] T110 [US3] Add visual warning when timer <= 30 seconds in frontend/src/components/Timer.tsx

**Checkpoint**: User Story 3 완료 - 라운드 진행, 타이머 동기화 기능 동작 확인

---

## Phase 6: User Story 4 - 두 방 분배 및 인질 교환 (Priority: P4)

**Goal**: 각 라운드마다 플레이어들은 빨간 방과 파란 방으로 자동 분배되며, 각 방에는 방장이 지정된다. 라운드 종료 시 각 방의 방장이 선택한 인질들이 방을 교환한다.

**Independent Test**: 게임 시작 시 플레이어들이 두 방으로 분배되고, 라운드 종료 시 방장들이 인질을 선택하여 교환하면, 다음 라운드에서 해당 플레이어들이 반대편 방에 있는지 확인.

### 백엔드 Tests for US4 (TDD - 먼저 작성)

- [ ] T111 [P] [US4] **TEST FIRST**: Contract test for POST /api/v1/rooms/{roomCode}/game/hostages in backend/tests/integration/game_handler_test.go
- [ ] T112 [P] [US4] **TEST FIRST**: Unit test for room assignment algorithm (AssignRooms FR-011) in backend/internal/services/game_service_test.go
- [ ] T113 [P] [US4] **TEST FIRST**: Unit test for leader assignment algorithm (AssignLeaders FR-024) in backend/internal/services/game_service_test.go
- [ ] T114 [P] [US4] **TEST FIRST**: Unit test for GameService.ExchangeHostages in backend/internal/services/game_service_test.go
- [ ] T115 [P] [US4] **TEST FIRST**: Integration test for HOSTAGE_EXCHANGED broadcast in backend/tests/integration/websocket_test.go

### 백엔드 Implementation for US4

- [ ] T116 [US4] Implement room assignment algorithm (AssignRooms - RED_ROOM/BLUE_ROOM equal split) in backend/internal/services/game_service.go
- [ ] T117 [US4] Implement leader assignment algorithm (AssignLeaders - first player in each room FR-024) in backend/internal/services/game_service.go
- [ ] T118 [US4] Update GameService.StartRound to call AssignRooms and AssignLeaders in backend/internal/services/game_service.go
- [ ] T119 [US4] Implement GameService.SelectHostage (validate leader, store selection, 60s timeout with auto-random selection per FR-011.1) in backend/internal/services/game_service.go
- [ ] T120 [US4] Implement GameService.ExchangeHostages (swap rooms, record HostageExchange with autoSelected flag) in backend/internal/services/game_service.go
- [ ] T121 [US4] Create POST /api/v1/rooms/{roomCode}/game/hostages handler in backend/internal/handlers/game_handler.go
- [ ] T122 [US4] Implement HOSTAGE_SELECTED broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T123 [US4] Implement HOSTAGE_EXCHANGED broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T124 [US4] Implement LEADER_CHANGED broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T125 [US4] Wire US4 routes to Gin router in backend/cmd/server/main.go

### 프론트엔드 Tests for US4 (TDD - 먼저 작성)

- [ ] T126 [P] [US4] **TEST FIRST**: Test RoomPlayers component showing players in current room in frontend/src/components/__tests__/RoomPlayers.test.tsx
- [ ] T127 [P] [US4] **TEST FIRST**: Test HostageSelector component (only for leaders) in frontend/src/components/__tests__/HostageSelector.test.tsx
- [ ] T128 [P] [US4] **TEST FIRST**: Test GamePage displays room info and leader badge in frontend/src/pages/__tests__/GamePage.test.tsx

### 프론트엔드 Implementation for US4

- [ ] T129 [P] [US4] Implement exchangeHostages API function in frontend/src/services/api.ts
- [ ] T130 [US4] Create RoomPlayers component showing players in RED_ROOM or BLUE_ROOM in frontend/src/components/RoomPlayers.tsx
- [ ] T131 [US4] Create HostageSelector component for leaders to select hostages in frontend/src/components/HostageSelector.tsx
- [ ] T132 [US4] Update GamePage to display current room name and player list in frontend/src/pages/GamePage.tsx
- [ ] T133 [US4] Add leader badge UI in RoomPlayers component in frontend/src/components/RoomPlayers.tsx
- [ ] T134 [US4] Integrate ROUND_STARTED message (update room assignments and leaders) in frontend/src/pages/GamePage.tsx
- [ ] T135 [US4] Integrate HOSTAGE_SELECTED message (show selected hostage) in frontend/src/pages/GamePage.tsx
- [ ] T136 [US4] Integrate HOSTAGE_EXCHANGED message (update player rooms for next round) in frontend/src/pages/GamePage.tsx
- [ ] T137 [US4] Integrate LEADER_CHANGED message (update leader badge) in frontend/src/pages/GamePage.tsx

**Checkpoint**: User Story 4 완료 - 방 분배, 방장 지정, 인질 교환 기능 동작 확인

---

## Phase 7: User Story 5 - 게임 결과 판정 (Priority: P5)

**Goal**: 마지막 라운드 종료 시 대통령과 폭파범이 같은 방에 있는지 확인하여 승리 팀을 자동으로 판정하고 결과를 표시한다.

**Independent Test**: 마지막 라운드 종료 시 대통령과 폭파범의 위치를 확인하고, 같은 방에 있으면 블루 팀 승리, 다른 방에 있으면 레드 팀 승리를 표시하는지 검증.

### 백엔드 Tests for US5 (TDD - 먼저 작성)

- [ ] T138 [P] [US5] **TEST FIRST**: Contract test for POST /api/v1/rooms/{roomCode}/game/end in backend/tests/integration/game_handler_test.go
- [ ] T139 [P] [US5] **TEST FIRST**: Unit test for GameService.DetermineWinner (same room = BLUE win) in backend/internal/services/game_service_test.go
- [ ] T140 [P] [US5] **TEST FIRST**: Unit test for GameService.DetermineWinner (different room = RED win) in backend/internal/services/game_service_test.go
- [ ] T141 [P] [US5] **TEST FIRST**: Integration test for GAME_ENDED broadcast in backend/tests/integration/websocket_test.go

### 백엔드 Implementation for US5

- [ ] T142 [US5] Implement GameService.DetermineWinner (check President/Bomber rooms FR-017, FR-018) in backend/internal/services/game_service.go
- [ ] T143 [US5] Implement GameService.EndGame (call DetermineWinner, update Room.Status, create GameResult) in backend/internal/services/game_service.go
- [ ] T144 [US5] Update GameService.OnRoundEnd to call EndGame on final round in backend/internal/services/game_service.go
- [ ] T145 [US5] Create POST /api/v1/rooms/{roomCode}/game/end handler in backend/internal/handlers/game_handler.go
- [ ] T146 [US5] Implement GAME_ENDED broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T147 [US5] Wire US5 routes to Gin router in backend/cmd/server/main.go

### 프론트엔드 Tests for US5 (TDD - 먼저 작성)

- [ ] T148 [P] [US5] **TEST FIRST**: Test ResultScreen component displaying winner in frontend/src/components/__tests__/ResultScreen.test.tsx
- [ ] T149 [P] [US5] **TEST FIRST**: Test ResultScreen displays all players with revealed roles in frontend/src/components/__tests__/ResultScreen.test.tsx
- [ ] T150 [P] [US5] **TEST FIRST**: Test GamePage navigates to result screen on GAME_ENDED in frontend/src/pages/__tests__/GamePage.test.tsx

### 프론트엔드 Implementation for US5

- [ ] T151 [P] [US5] Implement endGame API function in frontend/src/services/api.ts
- [ ] T152 [US5] Create ResultScreen component showing winning team, reason, and all player roles in frontend/src/components/ResultScreen.tsx
- [ ] T153 [US5] Create ResultPage with result screen and "새 게임 시작" button in frontend/src/pages/ResultPage.tsx
- [ ] T154 [US5] Integrate GAME_ENDED WebSocket message (navigate to result page) in frontend/src/pages/GamePage.tsx
- [ ] T155 [US5] Add "새 게임 시작" button in ResultPage (returns to lobby) in frontend/src/pages/ResultPage.tsx

**Checkpoint**: User Story 5 완료 - 게임 결과 판정, 결과 화면 표시 기능 동작 확인

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 여러 사용자 스토리에 영향을 미치는 개선사항 및 품질 향상

- [ ] T156 [P] Add connection error handling for WebSocket disconnections in frontend/src/hooks/useWebSocket.ts
- [ ] T158 [P] Add validation middleware for all request payloads in backend/internal/handlers/validation.go
- [ ] T159 [P] Add logging for all critical operations (room creation, game start, round transitions) in backend/internal/services/
- [ ] T160 [P] Implement graceful shutdown for WebSocket Hub in backend/cmd/server/main.go
- [ ] T161 [P] Add loading states and spinners for all async operations in frontend/src/components/
- [ ] T162 [P] Improve error messages with user-friendly Korean text in frontend/src/services/api.ts
- [ ] T163 [P] Add browser compatibility checks (WebSocket support) in frontend/src/App.tsx
- [ ] T164 [P] Create end-to-end test for full game flow (create room → join → start game → play rounds → see result) in backend/tests/integration/e2e_test.go
- [ ] T165 [P] Update README.md with quickstart instructions referencing quickstart.md
- [ ] T166 [P] Run manual validation following quickstart.md steps
- [ ] T167 Code cleanup and refactoring (remove dead code, improve naming)
- [ ] T168 Performance optimization (profile WebSocket broadcast, optimize room store queries)
- [ ] T169 Security hardening (add rate limiting for room creation, input sanitization)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 - 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료 필요 - 모든 사용자 스토리 차단
- **User Stories (Phase 3-7)**: Foundational 완료 필요
  - 충분한 인력이 있다면 병렬 진행 가능
  - 또는 우선순위 순서대로 순차 진행 (P1 → P2 → P3 → P4 → P5)
- **Polish (Phase 8)**: 원하는 모든 사용자 스토리 완료 필요

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 완료 후 시작 가능 - 다른 스토리에 의존성 없음
- **User Story 2 (P2)**: Foundational 완료 후 시작 가능 - US1과 통합 가능하지만 독립적으로 테스트 가능
- **User Story 3 (P3)**: Foundational 완료 후 시작 가능 - US1/US2와 통합되지만 독립적으로 테스트 가능
- **User Story 4 (P4)**: Foundational 완료 후 시작 가능 - US1/US2/US3과 통합되지만 독립적으로 테스트 가능
- **User Story 5 (P5)**: Foundational 완료 후 시작 가능 - 모든 이전 스토리와 통합되지만 독립적으로 테스트 가능

### Within Each User Story

- **TDD 필수**: 테스트 먼저 작성 및 실패 확인 → 구현 → 테스트 통과 (Red-Green-Refactor)
- 백엔드: Tests → Models → Services → Handlers → WebSocket Integration
- 프론트엔드: Tests → API Functions → Components → Pages → WebSocket Integration
- 핵심 구현 후 통합 작업
- 다음 우선순위 스토리로 이동 전 현재 스토리 완료

### Parallel Opportunities

- 모든 Setup 작업 중 [P] 표시된 작업 병렬 실행 가능
- Foundational 내 [P] 표시된 작업 병렬 실행 가능 (Phase 2 내)
- Foundational 완료 후 모든 사용자 스토리 병렬 시작 가능 (팀 역량 허용 시)
- 각 사용자 스토리 내 [P] 표시된 테스트 병렬 실행 가능
- 각 스토리 내 [P] 표시된 모델 병렬 실행 가능
- 다른 사용자 스토리는 다른 팀원이 병렬 작업 가능

---

## Parallel Example: User Story 1

```bash
# 백엔드 테스트 병렬 실행 (US1):
Task T027: "Contract test for POST /api/v1/rooms"
Task T028: "Contract test for GET /api/v1/rooms/{roomCode}"
Task T029: "Contract test for POST /api/v1/rooms/{roomCode}/players"
Task T030: "Contract test for PATCH /api/v1/rooms/{roomCode}/players/{playerId}/nickname"
Task T031: "Unit test for RoomService.CreateRoom"
Task T032: "Unit test for PlayerService.JoinRoom"
Task T033: "Unit test for PlayerService.UpdateNickname"
Task T034: "Integration test for WebSocket PLAYER_JOINED broadcast"

# 프론트엔드 테스트 병렬 실행 (US1):
Task T049: "Test HomePage component rendering"
Task T050: "Test LobbyPage component with player list"
Task T051: "Test RoomCodeInput component"
Task T052: "Test PlayerList component"
Task T053: "Test NicknameEditor component"

# API 함수 병렬 구현 (US1):
Task T054: "Implement createRoom API function"
Task T055: "Implement getRoom API function"
Task T056: "Implement joinRoom API function"
Task T057: "Implement updateNickname API function"
```

---

## Implementation Strategy

### MVP First (User Story 1만)

1. Phase 1 완료: Setup
2. Phase 2 완료: Foundational (**중요** - 모든 스토리 차단)
3. Phase 3 완료: User Story 1 (방 생성 및 플레이어 입장)
4. **중지 및 검증**: User Story 1 독립적으로 테스트
5. 준비되면 배포/데모

### Incremental Delivery

1. Setup + Foundational 완료 → Foundation 준비됨
2. User Story 1 추가 → 독립 테스트 → 배포/데모 (MVP!)
3. User Story 2 추가 → 독립 테스트 → 배포/데모
4. User Story 3 추가 → 독립 테스트 → 배포/데모
5. User Story 4 추가 → 독립 테스트 → 배포/데모
6. User Story 5 추가 → 독립 테스트 → 배포/데모
7. 각 스토리가 이전 스토리를 깨지 않고 가치 추가

### Parallel Team Strategy

여러 개발자가 있는 경우:

1. 팀이 Setup + Foundational을 함께 완료
2. Foundational 완료 후:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. 스토리들이 독립적으로 완료 및 통합

---

## Notes

- **[P] 작업** = 다른 파일, 의존성 없음, 병렬 실행 가능
- **[Story] 레이블** = 특정 사용자 스토리로 작업 추적 가능
- **TDD 필수** = 헌법 원칙 II에 따라 테스트 먼저 작성, 실패 확인, 구현, 통과 (Red-Green-Refactor)
- 각 사용자 스토리는 독립적으로 완료 및 테스트 가능해야 함
- 구현 전 테스트 실패 확인
- 각 작업 또는 논리적 그룹 후 커밋 (헌법 원칙 III: tasks.md 업데이트 후 커밋)
- 각 체크포인트에서 중지하여 스토리 독립적으로 검증
- 피해야 할 것: 모호한 작업, 동일 파일 충돌, 독립성을 깨는 스토리 간 의존성

---

## Task Count Summary

- **Total**: 169 tasks
- **Phase 1 (Setup)**: 7 tasks
- **Phase 2 (Foundational)**: 19 tasks
- **Phase 3 (US1)**: 38 tasks (14 backend tests, 11 backend impl, 5 frontend tests, 8 frontend impl)
- **Phase 4 (US2)**: 23 tasks (5 backend tests, 8 backend impl, 3 frontend tests, 7 frontend impl)
- **Phase 5 (US3)**: 23 tasks (5 backend tests, 8 backend impl, 3 frontend tests, 7 frontend impl)
- **Phase 6 (US4)**: 27 tasks (5 backend tests, 10 backend impl, 3 frontend tests, 9 frontend impl)
- **Phase 7 (US5)**: 18 tasks (4 backend tests, 6 backend impl, 3 frontend tests, 5 frontend impl)
- **Phase 8 (Polish)**: 14 tasks

**Parallel Opportunities**:
- Setup: 5 tasks in parallel
- Foundational: 9 tasks in parallel
- After Foundational: All 5 user stories can start in parallel (team capacity permitting)
- Within each story: Multiple tests, models, and API functions can run in parallel

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 64 tasks
