# Implementation Plan: 멀티플레이어 역할 배분 시스템

**Branch**: `001-multiplayer-game-host` | **Date**: 2025-10-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-multiplayer-game-host/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

다수의 플레이어가 웹 브라우저를 통해 "두개의 방, 한개의 폭탄" 보드게임의 역할 배분을 받을 수 있는 실시간 멀티플레이어 도구. Gin 기반 Go 백엔드와 React.js 프론트엔드를 사용하여 방 생성, 플레이어 입장, 역할 배분(대통령, 폭파범, 스파이, 요원), 방 배정(빨간 방/파란 방) 기능을 구현. 실제 게임 진행은 오프라인에서 플레이어들이 직접 수행.

## Technical Context

**Language/Version**: Go 1.21+ (백엔드), React 18+ with TypeScript (프론트엔드)
**Primary Dependencies**:
- 백엔드: Gin (웹 프레임워크), Gorilla WebSocket (실시간 통신)
- 프론트엔드: React 18, TypeScript, React Router (WebSocket은 네이티브 API 사용)

**Storage**: 인메모리 저장소 (게임 세션은 휘발성, 영구 저장 불필요)
**Testing**: Go testing 패키지 (백엔드), React Testing Library + Jest (프론트엔드)
**Target Platform**: 웹 브라우저 (데스크톱 및 모바일 브라우저)
**Project Type**: Web application (frontend + backend)
**Performance Goals**:
- 20명 동시 플레이어 지원 (4개 방 × 5명)
- 실시간 이벤트 동기화 1초 이하
- 방 생성/입장 5초 이내 응답

**Constraints**:
- 게임 데이터 휘발성 (세션 종료 시 삭제)
- 브라우저 호환성 (Chrome, Firefox, Safari, Edge 최신 2개 버전)
- 역할 배분 및 방 배정만 제공 (라운드 진행, 승패 판정 제외)

**Scale/Scope**:
- MVP: 6-30명 플레이어 지원
- 동시 게임 방: 초기 10개 방까지 지원
- 3개 우선순위별 사용자 스토리 (P1-P3)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: 한국어 문서화
✅ **PASS** - specs/ 하위 모든 문서 한국어로 작성됨 (spec.md, plan.md, 향후 tasks.md)

### Principle II: 테스트 우선 개발 (NON-NEGOTIABLE)
✅ **PASS** - 계획에 테스트 전략 포함 예정:
- 백엔드: Go testing으로 unit/integration 테스트
- 프론트엔드: React Testing Library + Jest
- tasks.md에서 각 user story별 테스트 작성 후 구현 명시

### Principle III: 진행 추적 및 커밋 정책
✅ **PASS** - tasks.md 생성 후 task/phase 단위 추적 예정

### Principle IV: Go/React 기술 스택
✅ **PASS** - 사용자 요구사항 반영:
- 백엔드: Go 1.21+ with Gin framework
- 프론트엔드: React 18+ with TypeScript
- 실시간 통신: WebSocket

### Principle V: 단순성 우선
✅ **PASS** - 복잡성 최소화:
- 인메모리 저장 (DB 불필요)
- 표준 WebSocket 사용 (추가 메시지 브로커 불필요)
- 단순한 RESTful API + WebSocket 조합

**결론**: 모든 헌법 원칙 준수. Phase 0 진행 가능.

## Project Structure

### Documentation (this feature)

```text
specs/001-multiplayer-game-host/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # 기능 명세
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api-spec.yaml    # OpenAPI 3.0 specification
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
two-rooms-and-a-boom/
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go           # 애플리케이션 진입점
│   ├── internal/
│   │   ├── models/               # 도메인 모델
│   │   │   ├── player.go
│   │   │   ├── room.go
│   │   │   ├── game_session.go
│   │   │   └── role.go
│   │   ├── services/             # 비즈니스 로직
│   │   │   ├── room_service.go
│   │   │   ├── game_service.go
│   │   │   └── player_service.go
│   │   ├── handlers/             # HTTP 핸들러
│   │   │   ├── room_handler.go
│   │   │   ├── game_handler.go
│   │   │   └── player_handler.go
│   │   └── websocket/            # 실시간 통신
│   │       ├── hub.go            # WebSocket 연결 관리
│   │       └── client.go         # 클라이언트 연결
│   ├── tests/                    # 테스트
│   │   ├── unit/
│   │   └── integration/
│   ├── go.mod
│   └── go.sum
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/           # React 컴포넌트
│   │   │   ├── Home.tsx
│   │   │   ├── Lobby.tsx
│   │   │   ├── GameBoard.tsx
│   │   │   ├── RoleCard.tsx
│   │   │   ├── Timer.tsx
│   │   │   └── ResultScreen.tsx
│   │   ├── pages/                # 페이지
│   │   │   ├── HomePage.tsx
│   │   │   ├── LobbyPage.tsx
│   │   │   └── GamePage.tsx
│   │   ├── services/             # API 클라이언트
│   │   │   ├── api.ts
│   │   │   └── websocket.ts
│   │   ├── hooks/                # 커스텀 훅
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useGame.ts
│   │   │   └── useRoom.ts
│   │   ├── types/                # TypeScript 타입 정의
│   │   │   └── game.types.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tests/                    # 테스트
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── specs/                        # 기능 명세 문서
├── README.md
└── .gitignore
```

**Structure Decision**:
웹 애플리케이션 구조 (Option 2) 선택. 백엔드와 프론트엔드를 분리하여 독립적으로 개발 및 배포 가능. Go 백엔드는 RESTful API + WebSocket 엔드포인트를 제공하고, React 프론트엔드는 SPA(Single Page Application)로 사용자 인터페이스 제공.

## Complexity Tracking

해당 없음 - 모든 헌법 원칙 준수, 추가 정당화 불필요.

## Specification Updates

**2025-10-23**: `/speckit.analyze` 실행 후 다음 사항 업데이트:
- FR-020 추가: 플레이어 재접속 30초 유예 기간 명시
- 스파이 역할 설명 명확화: 오프라인 플레이 시 활용되는 특수 능력임을 명시
- 방 정리 정책 단순화: 인메모리 저장소, 서버 재시작 시 삭제
- FR-005 보완: 닉네임 검증 규칙 추가 (2-20자, 영문/한글/숫자)
- FR-019 보완: WebSocket을 통한 실시간 동기화 명시
