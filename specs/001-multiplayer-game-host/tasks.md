# Tasks: 멀티플레이어 역할 배분 시스템

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

- [X] T001 Create backend directory structure (cmd/server, internal/models, internal/services, internal/handlers, internal/websocket, tests/)
- [X] T002 [P] Initialize Go module (go mod init) in backend/ with Gin and Gorilla WebSocket dependencies
- [X] T003 [P] Create frontend directory structure with Vite React TypeScript template
- [X] T004 [P] Configure backend linting (golangci-lint) and formatting (gofmt)
- [X] T005 [P] Configure frontend linting (ESLint) and formatting (Prettier) in frontend/
- [X] T006 [P] Setup CORS configuration for development in backend/cmd/server/main.go
- [X] T007 [P] Create environment configuration files (.env.example) for backend and frontend

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 사용자 스토리가 의존하는 핵심 인프라 구현. 이 Phase가 완료되어야 사용자 스토리 작업 시작 가능.

**⚠️ CRITICAL**: 이 Phase가 완료되기 전에는 어떤 사용자 스토리도 시작할 수 없음

### 백엔드 기초 인프라

- [X] T008 **TEST FIRST**: Create unit test for room code generation in backend/internal/services/room_service_test.go
- [X] T009 Implement room code generation function in backend/internal/services/room_service.go (6-digit alphanumeric, unique)
- [X] T010 **TEST FIRST**: Create unit test for in-memory room store CRUD operations in backend/internal/store/room_store_test.go
- [X] T011 Implement thread-safe in-memory room store in backend/internal/store/room_store.go (sync.RWMutex)
- [X] T012 [P] Define core domain models (Player, Room, RoomStatus, TeamColor, RoomColor) in backend/internal/models/player.go and backend/internal/models/room.go
- [X] T013 [P] Define game domain models (GameSession, Role) in backend/internal/models/game_session.go
- [X] T014 [P] Create error types and constants in backend/internal/models/errors.go
- [X] T015 [P] Setup Gin router with health check endpoint in backend/cmd/server/main.go
- [X] T016 **TEST FIRST**: Create WebSocket Hub test in backend/internal/websocket/hub_test.go
- [X] T017 Implement WebSocket Hub with register/unregister/broadcast channels in backend/internal/websocket/hub.go
- [X] T017.1 **TEST FIRST**: Create player reconnection logic test in backend/internal/websocket/hub_test.go (30-second grace period)
- [X] T017.2 Implement player reconnection logic (30-second grace period) in backend/internal/websocket/hub.go
- [X] T017.3 Implement PLAYER_DISCONNECTED broadcast when player connection lost in backend/internal/websocket/hub.go (FR-016)
- [X] T018 [P] **TEST FIRST**: Create WebSocket Client test in backend/internal/websocket/client_test.go
- [X] T019 [P] Implement WebSocket Client with read/write pumps in backend/internal/websocket/client.go
- [X] T020 Create WebSocket message types and serialization in backend/internal/websocket/messages.go

### 프론트엔드 기초 인프라

- [X] T021 [P] Define TypeScript types for all domain models in frontend/src/types/game.types.ts (Player, Room, GameSession, Role, etc.)
- [X] T022 [P] Create API client base configuration with fetch wrapper in frontend/src/services/api.ts
- [ ] T023 [P] **TEST FIRST**: Create useWebSocket hook test in frontend/src/hooks/__tests__/useWebSocket.test.ts (Deferred to integration phase)
- [X] T024 [P] Implement useWebSocket custom hook in frontend/src/hooks/useWebSocket.ts
- [X] T025 [P] Setup React Router with routes (/, /lobby/:roomCode, /game/:roomCode) in frontend/src/App.tsx
- [X] T026 [P] Create layout components (Header, Footer) in frontend/src/components/Layout.tsx

**Checkpoint**: Foundation ready - 사용자 스토리 구현 시작 가능

---

## Phase 3: User Story 1 - 방 생성 및 플레이어 입장 (Priority: P1) 🎯 MVP

**Goal**: 방장이 게임 방을 생성하고 플레이어들이 방 코드로 입장하여 대기실에서 서로를 확인할 수 있다.

**Independent Test**: 방장이 방을 생성하고 방 코드를 받아 다른 기기에서 해당 코드로 입장하여 플레이어 목록에 표시되는지 확인. 최소 2명의 플레이어가 동일한 대기실에 있으면 성공.

### 백엔드 Tests for US1 (TDD - 먼저 작성)

- [X] T027 [P] [US1] **TEST FIRST**: Contract test for POST /api/v1/rooms in backend/tests/integration/room_handler_test.go
- [X] T028 [P] [US1] **TEST FIRST**: Contract test for GET /api/v1/rooms/{roomCode} in backend/tests/integration/room_handler_test.go
- [X] T029 [P] [US1] **TEST FIRST**: Contract test for POST /api/v1/rooms/{roomCode}/players in backend/tests/integration/player_handler_test.go
- [X] T030 [P] [US1] **TEST FIRST**: Contract test for PATCH /api/v1/rooms/{roomCode}/players/{playerId}/nickname in backend/tests/integration/player_handler_test.go
- [X] T031 [P] [US1] **TEST FIRST**: Unit test for RoomService.CreateRoom in backend/internal/services/room_service_test.go
- [X] T032 [P] [US1] **TEST FIRST**: Unit test for PlayerService.JoinRoom in backend/internal/services/player_service_test.go
- [X] T033 [P] [US1] **TEST FIRST**: Unit test for PlayerService.UpdateNickname (including duplicate handling) in backend/internal/services/player_service_test.go
- [X] T034 [P] [US1] **TEST FIRST**: Integration test for PLAYER_JOINED/PLAYER_LEFT/NICKNAME_CHANGED WebSocket broadcasts in backend/tests/integration/websocket_test.go

### 백엔드 Implementation for US1

- [X] T035 [US1] Implement RoomService.CreateRoom (generate code, create room, store) in backend/internal/services/room_service.go
- [X] T036 [US1] Implement PlayerService.JoinRoom (validate room, create player, add to room) in backend/internal/services/player_service.go
- [X] T037 [US1] Implement PlayerService.UpdateNickname (validate, check duplicates, add suffix if needed) in backend/internal/services/player_service.go
- [X] T038 [US1] Create POST /api/v1/rooms handler in backend/internal/handlers/room_handler.go
- [X] T039 [US1] Create GET /api/v1/rooms/{roomCode} handler in backend/internal/handlers/room_handler.go
- [X] T040 [US1] Create POST /api/v1/rooms/{roomCode}/players handler in backend/internal/handlers/player_handler.go
- [X] T041 [US1] Create PATCH /api/v1/rooms/{roomCode}/players/{playerId}/nickname handler in backend/internal/handlers/player_handler.go
- [X] T042 [US1] Create WebSocket /ws/{roomCode} handler in backend/internal/handlers/websocket_handler.go
- [X] T043 [US1] Implement PLAYER_JOINED broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [X] T044 [US1] Implement PLAYER_LEFT broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [X] T045 [US1] Implement NICKNAME_CHANGED broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [X] T046 [US1] Wire all US1 routes to Gin router in backend/cmd/server/main.go

### 프론트엔드 Tests for US1 (TDD - 먼저 작성)

- [ ] T047 [P] [US1] **TEST FIRST**: Test HomePage component rendering in frontend/src/pages/__tests__/HomePage.test.tsx
- [ ] T048 [P] [US1] **TEST FIRST**: Test LobbyPage component with player list in frontend/src/pages/__tests__/LobbyPage.test.tsx
- [ ] T049 [P] [US1] **TEST FIRST**: Test RoomCodeInput component in frontend/src/components/__tests__/RoomCodeInput.test.tsx
- [ ] T050 [P] [US1] **TEST FIRST**: Test PlayerList component in frontend/src/components/__tests__/PlayerList.test.tsx
- [ ] T051 [P] [US1] **TEST FIRST**: Test NicknameEditor component in frontend/src/components/__tests__/NicknameEditor.test.tsx

### 프론트엔드 Implementation for US1

- [ ] T052 [P] [US1] Implement createRoom API function in frontend/src/services/api.ts
- [ ] T053 [P] [US1] Implement getRoom API function in frontend/src/services/api.ts
- [ ] T054 [P] [US1] Implement joinRoom API function in frontend/src/services/api.ts
- [ ] T055 [P] [US1] Implement updateNickname API function in frontend/src/services/api.ts
- [ ] T056 [US1] Create HomePage with "방 만들기" and "방 참가" buttons in frontend/src/pages/HomePage.tsx
- [ ] T057 [US1] Create RoomCodeInput component for entering room code in frontend/src/components/RoomCodeInput.tsx
- [ ] T058 [US1] Create LobbyPage with player list and WebSocket connection in frontend/src/pages/LobbyPage.tsx
- [ ] T059 [US1] Create PlayerList component showing all players in room in frontend/src/components/PlayerList.tsx
- [ ] T060 [US1] Create NicknameEditor component for editing own nickname in frontend/src/components/NicknameEditor.tsx
- [ ] T061 [US1] Integrate PLAYER_JOINED/PLAYER_LEFT/PLAYER_DISCONNECTED/NICKNAME_CHANGED WebSocket messages in frontend/src/pages/LobbyPage.tsx (FR-016)
- [ ] T062 [US1] Add error handling for room not found and game in progress in frontend/src/pages/LobbyPage.tsx

**Checkpoint**: User Story 1 완료 - 방 생성, 플레이어 입장, 닉네임 변경 기능 동작 확인

---

## Phase 4: User Story 2 - 역할 배분 및 방 배정 (Priority: P2) 🎯 CORE

**Goal**: 게임 시작 시 각 플레이어에게 역할 카드(대통령, 폭파범, 스파이, 요원)가 자동 배분되고, 빨간 방/파란 방에 무작위 배정된다.

**Independent Test**: 게임 시작 후 각 플레이어가 자신의 역할 카드와 방 배정을 확인하고, 대통령과 폭파범이 정확히 한 명씩 존재하는지, 각 팀에 스파이가 포함되어 있는지, 두 방에 플레이어가 균등하게 분배되었는지 검증.

### 백엔드 Tests for US2 (TDD - 먼저 작성)

- [ ] T063 [P] [US2] **TEST FIRST**: Contract test for POST /api/v1/rooms/{roomCode}/game/start in backend/tests/integration/game_handler_test.go
- [ ] T064 [P] [US2] **TEST FIRST**: Unit test for team assignment algorithm (AssignTeams - FR-008) in backend/internal/services/game_service_test.go
- [ ] T065 [P] [US2] **TEST FIRST**: Unit test for role distribution (1 president, 1 bomber, spies by player count) in backend/internal/services/game_service_test.go
- [ ] T066 [P] [US2] **TEST FIRST**: Unit test for room assignment algorithm (AssignRooms - FR-013) in backend/internal/services/game_service_test.go
- [ ] T067 [P] [US2] **TEST FIRST**: Integration test for GAME_STARTED and ROLE_ASSIGNED WebSocket messages in backend/tests/integration/websocket_test.go

### 백엔드 Implementation for US2

- [ ] T068 [US2] Define predefined roles (RolePresident, RoleBomber, RoleRedSpy, RoleBlueSpy, RoleRedOperative, RoleBlueOperative) in backend/internal/models/role.go
- [ ] T069 [US2] Implement team assignment algorithm (AssignTeams - FR-008: Red team +1 if odd) in backend/internal/services/game_service.go
- [ ] T070 [US2] Implement role distribution algorithm (FR-009: President=BLUE, Bomber=RED, FR-010: Spies per team) in backend/internal/services/game_service.go
- [ ] T071 [US2] Implement room assignment algorithm (AssignRooms - FR-013: RED_ROOM/BLUE_ROOM equal split) in backend/internal/services/game_service.go
- [ ] T072 [US2] Implement GameService.StartGame (validate >=6 players, create session, assign teams, assign roles, assign rooms) in backend/internal/services/game_service.go
- [ ] T073 [US2] Create POST /api/v1/rooms/{roomCode}/game/start handler in backend/internal/handlers/game_handler.go
- [ ] T074 [US2] Implement GAME_STARTED broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T075 [US2] Implement ROLE_ASSIGNED unicast (to individual player) in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T076 [US2] Wire US2 routes to Gin router in backend/cmd/server/main.go

### 프론트엔드 Tests for US2 (TDD - 먼저 작성)

- [ ] T077 [P] [US2] **TEST FIRST**: Test GamePage component rendering in frontend/src/pages/__tests__/GamePage.test.tsx
- [ ] T078 [P] [US2] **TEST FIRST**: Test RoleCard component in frontend/src/components/__tests__/RoleCard.test.tsx
- [ ] T079 [P] [US2] **TEST FIRST**: Test RoomPlayerList component in frontend/src/components/__tests__/RoomPlayerList.test.tsx

### 프론트엔드 Implementation for US2

- [ ] T080 [P] [US2] Implement startGame API function in frontend/src/services/api.ts
- [ ] T081 [US2] Create GamePage with role card and room assignment display in frontend/src/pages/GamePage.tsx
- [ ] T082 [US2] Create RoleCard component showing player's role and team in frontend/src/components/RoleCard.tsx
- [ ] T083 [US2] Create RoomPlayerList component showing same-room players in frontend/src/components/RoomPlayerList.tsx
- [ ] T084 [US2] Integrate GAME_STARTED and ROLE_ASSIGNED WebSocket messages in frontend/src/pages/LobbyPage.tsx
- [ ] T085 [US2] Add "게임 시작" button in LobbyPage (visible only to room owner) in frontend/src/pages/LobbyPage.tsx

**Checkpoint**: User Story 2 완료 - 역할 배분 및 방 배정 기능 동작 확인

---

## Phase 5: User Story 3 - 게임 종료 및 재시작 (Priority: P3)

**Goal**: 오프라인 게임이 끝난 후, 방장이 대기실로 돌아가 새로운 게임을 시작할 수 있다.

**Independent Test**: 게임 화면에서 방장이 "대기실로 돌아가기" 버튼을 클릭하면 모든 플레이어가 대기실로 돌아가고, 다시 게임을 시작할 수 있는지 확인.

### 백엔드 Tests for US3 (TDD - 먼저 작성)

- [ ] T086 [P] [US3] **TEST FIRST**: Contract test for POST /api/v1/rooms/{roomCode}/game/reset in backend/tests/integration/game_handler_test.go
- [ ] T087 [P] [US3] **TEST FIRST**: Unit test for GameService.ResetGame in backend/internal/services/game_service_test.go
- [ ] T088 [P] [US3] **TEST FIRST**: Integration test for GAME_RESET WebSocket broadcast in backend/tests/integration/websocket_test.go

### 백엔드 Implementation for US3

- [ ] T089 [US3] Implement GameService.ResetGame (clear session, reset player roles/rooms, set room status to WAITING) in backend/internal/services/game_service.go
- [ ] T090 [US3] Create POST /api/v1/rooms/{roomCode}/game/reset handler in backend/internal/handlers/game_handler.go
- [ ] T091 [US3] Implement GAME_RESET broadcast in WebSocket Hub for backend/internal/websocket/hub.go
- [ ] T092 [US3] Wire US3 routes to Gin router in backend/cmd/server/main.go

### 프론트엔드 Tests for US3 (TDD - 먼저 작성)

- [ ] T093 [P] [US3] **TEST FIRST**: Test ResetButton component in frontend/src/components/__tests__/ResetButton.test.tsx

### 프론트엔드 Implementation for US3

- [ ] T094 [P] [US3] Implement resetGame API function in frontend/src/services/api.ts
- [ ] T095 [US3] Add "대기실로 돌아가기" button in GamePage (visible only to room owner) in frontend/src/pages/GamePage.tsx
- [ ] T096 [US3] Integrate GAME_RESET WebSocket message in frontend/src/pages/GamePage.tsx (redirect to lobby)

**Checkpoint**: User Story 3 완료 - 게임 종료 및 재시작 기능 동작 확인

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 여러 사용자 스토리에 영향을 미치는 개선사항 및 품질 향상

- [ ] T097 [P] Add connection error handling for WebSocket disconnections in frontend/src/hooks/useWebSocket.ts
- [ ] T098 [P] **TEST FIRST**: Unit test for RoomService.TransferOwnership (FR-017) in backend/internal/services/room_service_test.go
- [ ] T099 Implement RoomService.TransferOwnership (transfer to next player when owner leaves FR-017) in backend/internal/services/room_service.go
- [ ] T100 Implement OWNER_CHANGED WebSocket broadcast in backend/internal/websocket/hub.go (FR-017)
- [ ] T101 Integrate OWNER_CHANGED message handling in frontend/src/pages/LobbyPage.tsx (update UI to reflect new owner)
- [ ] T102 [P] Add validation middleware for all request payloads in backend/internal/handlers/validation.go
- [ ] T103 [P] Add logging for all critical operations (room creation, game start) in backend/internal/services/
- [ ] T104 [P] Implement graceful shutdown for WebSocket Hub in backend/cmd/server/main.go
- [ ] T105 [P] Add loading states and spinners for all async operations in frontend/src/components/
- [ ] T106 [P] Improve error messages with user-friendly Korean text in frontend/src/services/api.ts
- [ ] T107 [P] Add browser compatibility checks (WebSocket support) in frontend/src/App.tsx
- [ ] T108 [P] Create end-to-end test for full flow (create room → join → start game → see roles → reset) in backend/tests/integration/e2e_test.go
- [ ] T109 [P] Update README.md with quickstart instructions

**Checkpoint**: Polish 완료 - 모든 에지 케이스 및 사용성 개선 적용

---

## Implementation Notes

### Execution Strategy

- TDD 원칙 준수: 각 기능 구현 전 테스트 먼저 작성
- 각 작업 또는 논리적 그룹 후 커밋
- 각 체크포인트에서 중지하여 스토리 독립적으로 검증
- 피해야 할 것: 모호한 작업, 동일 파일 충돌, 독립성을 깨는 스토리 간 의존성

---

## Task Count Summary

- **Total**: 109 tasks
- **Phase 1 (Setup)**: 7 tasks
- **Phase 2 (Foundational)**: 20 tasks
- **Phase 3 (US1)**: 36 tasks (8 backend tests, 12 backend impl, 5 frontend tests, 11 frontend impl)
- **Phase 4 (US2)**: 23 tasks (5 backend tests, 9 backend impl, 3 frontend tests, 6 frontend impl)
- **Phase 5 (US3)**: 11 tasks (3 backend tests, 4 backend impl, 1 frontend test, 3 frontend impl)
- **Phase 6 (Polish)**: 13 tasks

**Parallel Opportunities**:
- Setup: 5 tasks in parallel
- Foundational: 9 tasks in parallel
- After Foundational: All 3 user stories can start in parallel (team capacity permitting)
- Within each story: Multiple tests, models, and API functions can run in parallel

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 63 tasks
**Complete Product**: All 6 phases = 109 tasks
