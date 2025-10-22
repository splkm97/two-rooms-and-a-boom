# Developer Quickstart: 멀티플레이어 게임 진행 시스템

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Created**: 2025-10-22 | **Phase**: 1 (Design)

## Overview

이 문서는 "두개의 방, 한개의 폭탄" 멀티플레이어 게임 시스템 개발을 시작하기 위한 빠른 시작 가이드입니다.

**필수 사전 지식**:
- Go 1.21+ 기본 문법
- React 18+ 및 TypeScript
- WebSocket 기본 개념
- Git 기본 명령어

**개발 원칙 (헌법 준수)**:
- ✅ 테스트 우선 개발 (TDD) - 테스트 없는 커밋 불가
- ✅ 한국어 문서화 - specs/ 하위 모든 문서 한국어 작성
- ✅ 진행 추적 - tasks.md 업데이트 후 커밋
- ✅ Go/React 기술 스택 - 표준 라이브러리 우선

## Prerequisites

### 1. 필수 도구 설치

**Backend (Go)**:
```bash
# Go 1.21+ 설치 확인
go version
# 출력: go version go1.21.0 darwin/arm64 (또는 유사)

# Gin 프레임워크 설치 (프로젝트 초기화 후)
go get -u github.com/gin-gonic/gin

# Gorilla WebSocket 설치
go get -u github.com/gorilla/websocket

# 테스트 도구 (표준 라이브러리 포함)
# go test 명령어 사용
```

**Frontend (React)**:
```bash
# Node.js 18+ 및 npm 설치 확인
node --version
npm --version

# Vite 기반 React + TypeScript 프로젝트 생성 (프로젝트 초기화 시)
npm create vite@latest frontend -- --template react-ts

# 의존성 설치 (frontend/ 디렉토리에서)
cd frontend
npm install

# WebSocket 클라이언트 (필요 시)
npm install --save-dev @types/ws
```

### 2. 프로젝트 구조 확인

```bash
# 프로젝트 루트 확인
cd /Users/kalee/IdeaProjects/two-rooms-and-a-boom

# 현재 브랜치 확인 (001-multiplayer-game-host)
git branch

# 예상 디렉토리 구조
tree -L 3 -I 'node_modules|.git'
```

**예상 출력**:
```
two-rooms-and-a-boom/
├── backend/
│   ├── cmd/
│   │   └── server/
│   ├── internal/
│   │   ├── models/
│   │   ├── services/
│   │   ├── handlers/
│   │   └── websocket/
│   ├── tests/
│   ├── go.mod
│   └── go.sum
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
├── specs/
│   └── 001-multiplayer-game-host/
│       ├── spec.md
│       ├── plan.md
│       ├── research.md
│       ├── data-model.md
│       ├── quickstart.md (이 파일)
│       └── contracts/
│           └── api-spec.yaml
├── README.md
└── .gitignore
```

## Backend Setup (Go)

### 1. Go 모듈 초기화

```bash
# backend/ 디렉토리 생성
mkdir -p backend/cmd/server
mkdir -p backend/internal/{models,services,handlers,websocket}
mkdir -p backend/tests/{unit,integration}

cd backend

# Go 모듈 초기화
go mod init github.com/yourusername/two-rooms-and-a-boom

# 의존성 설치
go get -u github.com/gin-gonic/gin
go get -u github.com/gorilla/websocket
go get -u github.com/google/uuid
```

### 2. 기본 서버 설정

**`backend/cmd/server/main.go`** (초기 진입점):

```go
package main

import (
    "log"

    "github.com/gin-gonic/gin"
)

func main() {
    // Gin 라우터 생성
    router := gin.Default()

    // CORS 설정 (개발 환경)
    router.Use(func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }
        c.Next()
    })

    // Health check 엔드포인트
    router.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })

    // TODO: API 라우트 추가 (tasks.md 참조)

    // 서버 시작
    log.Println("Server starting on :8080")
    if err := router.Run(":8080"); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}
```

### 3. 서버 실행 및 테스트

```bash
# backend/ 디렉토리에서
go run cmd/server/main.go

# 다른 터미널에서 health check 확인
curl http://localhost:8080/health
# 예상 출력: {"status":"ok"}
```

### 4. 첫 번째 테스트 작성 (TDD)

**`backend/internal/services/room_service_test.go`**:

```go
package services

import (
    "testing"
)

// TDD: 테스트부터 작성 (Red 단계)
func TestGenerateRoomCode_ReturnsValidCode(t *testing.T) {
    code := GenerateRoomCode()

    // 6자리 확인
    if len(code) != 6 {
        t.Errorf("Expected code length 6, got %d", len(code))
    }

    // 대문자 영숫자 확인
    for _, char := range code {
        if !isAlphanumeric(char) {
            t.Errorf("Code contains invalid character: %c", char)
        }
    }
}

func isAlphanumeric(char rune) bool {
    return (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9')
}
```

**테스트 실행** (실패 예상 - Red 단계):
```bash
go test ./internal/services/...
# 예상 출력: FAIL (함수가 아직 구현되지 않음)
```

**구현** (Green 단계):

**`backend/internal/services/room_service.go`**:

```go
package services

import (
    "math/rand"
    "time"
)

func init() {
    rand.Seed(time.Now().UnixNano())
}

func GenerateRoomCode() string {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const length = 6

    code := make([]byte, length)
    for i := range code {
        code[i] = charset[rand.Intn(len(charset))]
    }
    return string(code)
}
```

**테스트 재실행** (성공 예상 - Green 단계):
```bash
go test ./internal/services/...
# 예상 출력: PASS
```

**Refactor 단계**: 코드 정리 및 리팩토링 (필요 시)

## Frontend Setup (React + TypeScript)

### 1. Vite 프로젝트 생성

```bash
# 프로젝트 루트에서
npm create vite@latest frontend -- --template react-ts

cd frontend
npm install

# 개발 서버 실행
npm run dev
# 예상 출력: http://localhost:5173
```

### 2. 프로젝트 구조 생성

```bash
# frontend/src/ 디렉토리에서
mkdir -p components pages services hooks types

# 기본 파일 생성
touch src/types/game.types.ts
touch src/services/api.ts
touch src/services/websocket.ts
touch src/hooks/useWebSocket.ts
touch src/pages/HomePage.tsx
touch src/pages/LobbyPage.tsx
touch src/pages/GamePage.tsx
```

### 3. TypeScript 타입 정의

**`frontend/src/types/game.types.ts`** (data-model.md 참조):

```typescript
// 열거형 정의
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

// 인터페이스 정의 (data-model.md 전체 내용 참조)
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
  connectedAt: string;
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

// ... (나머지 타입 정의는 data-model.md 참조)
```

### 4. API 클라이언트 설정

**`frontend/src/services/api.ts`**:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// 방 생성
export async function createRoom(maxPlayers: number): Promise<Room> {
  const response = await fetch(`${API_BASE_URL}/api/v1/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxPlayers }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create room');
  }

  return response.json();
}

// 방 입장
export async function joinRoom(roomCode: string, nickname?: string): Promise<Player> {
  const response = await fetch(`${API_BASE_URL}/api/v1/rooms/${roomCode}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join room');
  }

  return response.json();
}

// 게임 시작
export async function startGame(roomCode: string): Promise<GameSession> {
  const response = await fetch(`${API_BASE_URL}/api/v1/rooms/${roomCode}/game/start`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start game');
  }

  return response.json();
}

// ... (나머지 API 함수는 contracts/api-spec.yaml 참조)
```

### 5. WebSocket 훅 작성

**`frontend/src/hooks/useWebSocket.ts`** (research.md 참조):

```typescript
import { useEffect, useRef, useState } from 'react';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080';

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export function useWebSocket(roomCode: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // WebSocket 연결
    ws.current = new WebSocket(`${WS_BASE_URL}/ws/${roomCode}`);

    ws.current.onopen = () => {
      console.log(`[WebSocket] Connected to room ${roomCode}`);
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log(`[WebSocket] Received:`, message);
      setLastMessage(message);
    };

    ws.current.onclose = () => {
      console.log(`[WebSocket] Disconnected from room ${roomCode}`);
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error(`[WebSocket] Error:`, error);
    };

    // 정리 함수
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [roomCode]);

  const sendMessage = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message: connection not open');
    }
  };

  return { isConnected, lastMessage, sendMessage };
}
```

### 6. 첫 번째 컴포넌트 테스트 (TDD)

**`frontend/src/components/Timer.test.tsx`**:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { Timer } from './Timer';

describe('Timer', () => {
  test('displays initial time', () => {
    render(<Timer initialTime={60} />);
    expect(screen.getByText('60초')).toBeInTheDocument();
  });

  test('counts down every second', async () => {
    render(<Timer initialTime={3} />);

    expect(screen.getByText('3초')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('2초')).toBeInTheDocument(), {
      timeout: 1500,
    });

    await waitFor(() => expect(screen.getByText('1초')).toBeInTheDocument(), {
      timeout: 1500,
    });
  });
});
```

**컴포넌트 구현**:

**`frontend/src/components/Timer.tsx`**:

```tsx
import { useEffect, useState } from 'react';

interface TimerProps {
  initialTime: number;
}

export function Timer({ initialTime }: TimerProps) {
  const [remaining, setRemaining] = useState(initialTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return <div>{remaining}초</div>;
}
```

**테스트 실행**:
```bash
npm test
```

## Development Workflow (TDD 준수)

### 헌법 원칙 II: 테스트 우선 개발

**Red-Green-Refactor 사이클**:

1. **Red**: 실패하는 테스트 작성
   ```bash
   # 백엔드
   go test ./internal/services/... -v
   # 예상: FAIL

   # 프론트엔드
   npm test
   # 예상: FAIL
   ```

2. **Green**: 최소한의 코드로 테스트 통과
   ```bash
   # 코드 구현 후
   go test ./internal/services/... -v
   # 예상: PASS

   npm test
   # 예상: PASS
   ```

3. **Refactor**: 코드 정리 및 최적화
   - 중복 제거
   - 가독성 향상
   - 성능 최적화
   - 테스트는 여전히 통과해야 함

4. **Commit**: tasks.md 업데이트 후 커밋
   ```bash
   # tasks.md에서 완료된 작업 체크
   vim specs/001-multiplayer-game-host/tasks.md

   # 커밋 전 체크리스트
   # ✅ 모든 테스트 통과
   # ✅ tasks.md 업데이트 완료
   # ✅ 린트 에러 없음
   # ✅ 헌법 준수 확인

   git add .
   git commit -m "Implement room code generation with tests"
   ```

## Common Commands

### Backend (Go)

```bash
# 서버 실행
go run cmd/server/main.go

# 모든 테스트 실행
go test ./... -v

# 특정 패키지 테스트
go test ./internal/services/... -v

# 테스트 커버리지
go test ./... -cover

# 린트 (golangci-lint 설치 필요)
golangci-lint run

# 의존성 정리
go mod tidy
```

### Frontend (React)

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 테스트 실행
npm test

# 테스트 커버리지
npm test -- --coverage

# 린트
npm run lint

# 타입 체크
npx tsc --noEmit
```

### Git 워크플로우

```bash
# 현재 브랜치 확인
git branch
# 출력: * 001-multiplayer-game-host

# 변경사항 확인
git status

# tasks.md 업데이트 후 커밋
git add .
git commit -m "Implement feature X with tests"

# 원격 푸시
git push origin 001-multiplayer-game-host

# Pull Request 생성 (GitHub CLI)
gh pr create --title "Feature: Multiplayer Game Host" --body "..."
```

## Troubleshooting

### 백엔드 문제

**문제**: `go: cannot find main module`
```bash
# 해결: go.mod 파일 확인
cd backend
cat go.mod
# go.mod가 없으면 초기화
go mod init github.com/yourusername/two-rooms-and-a-boom
```

**문제**: 의존성 다운로드 실패
```bash
# 해결: 프록시 설정 또는 직접 다운로드
GOPROXY=direct go get -u github.com/gin-gonic/gin
```

**문제**: WebSocket 연결 실패
```bash
# 해결: CORS 설정 확인 (main.go)
# Gorilla WebSocket의 CheckOrigin 설정
upgrader := websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true // 개발 환경에서만
    },
}
```

### 프론트엔드 문제

**문제**: `Cannot find module 'vite'`
```bash
# 해결: 의존성 재설치
rm -rf node_modules package-lock.json
npm install
```

**문제**: WebSocket 연결 거부
```bash
# 해결: 백엔드 서버 실행 확인
curl http://localhost:8080/health

# 환경 변수 확인
cat .env.local
# VITE_API_BASE_URL=http://localhost:8080
# VITE_WS_BASE_URL=ws://localhost:8080
```

**문제**: TypeScript 타입 에러
```bash
# 해결: 타입 정의 확인
npx tsc --noEmit
# 에러 메시지에 따라 types/game.types.ts 수정
```

## Next Steps

개발 준비가 완료되었습니다! 다음 단계:

1. **tasks.md 생성 및 확인**:
   ```bash
   # /speckit.tasks 명령어로 생성
   cat specs/001-multiplayer-game-host/tasks.md
   ```

2. **Phase 별 작업 시작**:
   - Phase 0: 인프라 설정 (Go 모듈, React 프로젝트)
   - Phase 1: 도메인 모델 구현 (Player, Room, GameSession)
   - Phase 2: API 엔드포인트 구현 (방 생성, 입장, 게임 시작)
   - Phase 3: WebSocket 실시간 통신 구현
   - Phase 4: UI 컴포넌트 구현
   - Phase 5: 통합 테스트 및 E2E 테스트

3. **헌법 준수 확인**:
   - ✅ 모든 코드에 테스트 작성
   - ✅ tasks.md 지속적으로 업데이트
   - ✅ 커밋 전 품질 게이트 통과
   - ✅ 한국어 문서화 유지

## Reference Documents

- **Feature Specification**: [spec.md](./spec.md) - 기능 명세 및 요구사항
- **Implementation Plan**: [plan.md](./plan.md) - 구현 계획 및 기술 결정
- **Data Model**: [data-model.md](./data-model.md) - 도메인 모델 및 관계
- **API Contracts**: [contracts/api-spec.yaml](./contracts/api-spec.yaml) - OpenAPI 3.0 명세
- **Technical Research**: [research.md](./research.md) - 기술 선택 및 모범 사례
- **Project Constitution**: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) - 프로젝트 헌법

## Getting Help

문제 발생 시:
1. 관련 문서 (위 Reference Documents) 확인
2. `research.md`의 Best Practices 섹션 참조
3. `contracts/api-spec.yaml`에서 API 명세 확인
4. 헌법 위반 여부 확인 (constitution.md)
5. Git 커밋 히스토리에서 유사 사례 검색

**Happy Coding!** 🚀
