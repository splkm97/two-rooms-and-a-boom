# Technical Research: 멀티플레이어 게임 진행 시스템

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Created**: 2025-10-22 | **Phase**: 0 (Research)

## Overview

이 문서는 "두개의 방, 한개의 폭탄" 멀티플레이어 게임 시스템 구현을 위한 기술 선택, 모범 사례, 통합 패턴을 정리합니다.

## Technology Decisions

### 1. Backend Framework: Gin

**선택 이유**:
- **성능**: Go의 고루틴을 활용한 동시성 처리, 20명 동시 플레이어 지원에 최적
- **단순성**: 미들웨어 체인과 라우팅이 직관적, 학습 곡선 완만
- **경량**: 표준 라이브러리 기반, 불필요한 추상화 없음 (헌법 원칙 V 준수)
- **검증된 사용**: 실전 프로덕션 환경에서 광범위하게 사용

**대안 검토**:
- **net/http (표준 라이브러리)**: 충분히 사용 가능하나, 라우팅 및 미들웨어 반복 코드 증가
- **Echo**: Gin과 유사하나, 커뮤니티 규모 및 문서화 측면에서 Gin이 우세
- **Fiber**: 성능은 우수하나, Go 표준 관례에서 벗어남 (헌법 원칙 IV 위배)

**Best Practices**:
```go
// 권장 구조: 핸들러는 얇게, 로직은 서비스 레이어에
func CreateRoomHandler(roomService *services.RoomService) gin.HandlerFunc {
    return func(c *gin.Context) {
        var req CreateRoomRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(400, gin.H{"error": err.Error()})
            return
        }
        room, err := roomService.CreateRoom(req.MaxPlayers)
        if err != nil {
            c.JSON(500, gin.H{"error": err.Error()})
            return
        }
        c.JSON(201, room)
    }
}
```

### 2. WebSocket Library: Gorilla WebSocket

**선택 이유**:
- **표준 준수**: RFC 6455 WebSocket 프로토콜 완전 구현
- **안정성**: 2013년부터 유지관리, 프로덕션 검증 완료
- **제어 수준**: 저수준 API 제공, 커스텀 프로토콜 구현 가능
- **Go 표준 관례**: context, error handling 등 Go 관례 준수

**대안 검토**:
- **golang.org/x/net/websocket**: 구식이며 더 이상 권장되지 않음
- **nhooyr.io/websocket**: 현대적이나 Gorilla 대비 커뮤니티 작음
- **Socket.io (서버)**: 양방향 이벤트 시스템 제공하나, 과도한 추상화 (헌법 원칙 V 위배)

**Best Practices**:
```go
// Hub 패턴: 모든 클라이언트 연결을 중앙에서 관리
type Hub struct {
    clients    map[*Client]bool
    broadcast  chan []byte
    register   chan *Client
    unregister chan *Client
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.clients[client] = true
        case client := <-h.unregister:
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
            }
        case message := <-h.broadcast:
            for client := range h.clients {
                select {
                case client.send <- message:
                default:
                    close(client.send)
                    delete(h.clients, client)
                }
            }
        }
    }
}
```

### 3. Frontend Framework: React 18

**선택 이유**:
- **사용자 경험**: Virtual DOM 및 효율적인 재렌더링으로 실시간 UI 업데이트 최적화
- **생태계**: 풍부한 라이브러리 및 커뮤니티 지원
- **Hooks**: 상태 관리 및 사이드 이펙트 처리 단순화
- **TypeScript 지원**: 타입 안정성 확보

**대안 검토**:
- **Vue.js**: 학습 곡선은 완만하나, React 생태계가 더 성숙
- **Svelte**: 컴파일 타임 최적화 우수하나, 생태계 작음
- **Vanilla JS**: 가능하나 실시간 상태 관리 복잡도 증가

**Best Practices**:
```tsx
// 커스텀 훅으로 WebSocket 로직 캡슐화
function useWebSocket(roomCode: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        ws.current = new WebSocket(`ws://localhost:8080/ws/${roomCode}`);

        ws.current.onopen = () => setIsConnected(true);
        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setGameState(data);
        };
        ws.current.onclose = () => setIsConnected(false);

        return () => ws.current?.close();
    }, [roomCode]);

    const sendMessage = (message: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        }
    };

    return { isConnected, gameState, sendMessage };
}
```

### 4. Storage Strategy: In-Memory

**선택 이유**:
- **요구사항 적합**: 게임 세션은 휘발성, 영구 저장 불필요 (spec.md 명시)
- **단순성**: DB 설정 및 ORM 불필요 (헌법 원칙 V 준수)
- **성능**: 메모리 접근 속도로 1초 이하 동기화 보장
- **배포 편의**: 외부 의존성 없음

**제약사항**:
- 서버 재시작 시 모든 게임 세션 손실
- 수평 확장 시 세션 공유 불가 (초기 MVP에서는 단일 서버로 충분)

**Best Practices**:
```go
// Thread-safe 인메모리 저장소
type RoomStore struct {
    mu    sync.RWMutex
    rooms map[string]*models.Room
}

func (s *RoomStore) GetRoom(code string) (*models.Room, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    room, exists := s.rooms[code]
    if !exists {
        return nil, ErrRoomNotFound
    }
    return room, nil
}

func (s *RoomStore) CreateRoom(room *models.Room) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, exists := s.rooms[room.Code]; exists {
        return ErrRoomAlreadyExists
    }
    s.rooms[room.Code] = room
    return nil
}
```

## Integration Patterns

### 1. WebSocket Message Protocol

**설계 결정**: JSON 기반 메시지 포맷

```typescript
// 공통 메시지 구조
interface WebSocketMessage {
    type: 'PLAYER_JOINED' | 'GAME_STARTED' | 'TIMER_UPDATE' | 'ROLE_ASSIGNED' | 'GAME_ENDED';
    payload: any;
    timestamp: number;
}

// 예시: 플레이어 입장 이벤트
{
    "type": "PLAYER_JOINED",
    "payload": {
        "playerId": "uuid-1234",
        "nickname": "플레이어1",
        "roomCode": "ABC123"
    },
    "timestamp": 1698012345678
}
```

**이유**:
- JSON은 Go와 React에서 네이티브 지원
- 디버깅 용이 (사람이 읽을 수 있음)
- 타입 안정성 (TypeScript 인터페이스 정의 가능)

### 2. Timer Synchronization Pattern

**문제**: 클라이언트 시간 불일치 방지

**해결책**: 서버 주도 타이머 + 클라이언트 보간

```go
// 서버: 1초마다 남은 시간 브로드캐스트
func (g *GameService) StartRoundTimer(roomCode string, duration int) {
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()

    remaining := duration
    for range ticker.C {
        remaining--
        g.hub.BroadcastToRoom(roomCode, TimerUpdateMessage{
            Type: "TIMER_UPDATE",
            Payload: map[string]int{"remaining": remaining},
        })

        if remaining <= 0 {
            g.EndRound(roomCode)
            break
        }
    }
}
```

```tsx
// 클라이언트: 서버 시간 수신 + 로컬 보간
function Timer({ initialTime }: { initialTime: number }) {
    const [remaining, setRemaining] = useState(initialTime);

    useEffect(() => {
        // 서버로부터 업데이트 수신
        const unsubscribe = subscribeToTimerUpdates((newTime) => {
            setRemaining(newTime);
        });

        // 로컬 보간 (부드러운 UI)
        const interval = setInterval(() => {
            setRemaining(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    return <div>{remaining}초</div>;
}
```

### 3. Room Code Generation

**요구사항**: 짧고 기억하기 쉬운 고유 코드

```go
// 6자리 대문자 영숫자 코드 생성
func GenerateRoomCode() string {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const length = 6

    b := make([]byte, length)
    for i := range b {
        b[i] = charset[rand.Intn(len(charset))]
    }
    return string(b)
}

// 충돌 방지: 기존 코드 확인 후 재생성
func (s *RoomService) GenerateUniqueRoomCode() string {
    for {
        code := GenerateRoomCode()
        if _, err := s.store.GetRoom(code); err == ErrRoomNotFound {
            return code
        }
    }
}
```

## Testing Strategy

### 1. Backend Testing

**Unit Tests**: 비즈니스 로직 검증

```go
// services/room_service_test.go
func TestCreateRoom_Success(t *testing.T) {
    store := NewInMemoryRoomStore()
    service := NewRoomService(store)

    room, err := service.CreateRoom(10)

    assert.NoError(t, err)
    assert.NotEmpty(t, room.Code)
    assert.Equal(t, 10, room.MaxPlayers)
    assert.Equal(t, RoomStatusWaiting, room.Status)
}

func TestCreateRoom_GeneratesUniqueCode(t *testing.T) {
    store := NewInMemoryRoomStore()
    service := NewRoomService(store)

    room1, _ := service.CreateRoom(10)
    room2, _ := service.CreateRoom(10)

    assert.NotEqual(t, room1.Code, room2.Code)
}
```

**Integration Tests**: WebSocket 통신 검증

```go
// websocket/hub_test.go
func TestHub_BroadcastMessage(t *testing.T) {
    hub := NewHub()
    go hub.Run()

    // 2개 클라이언트 연결
    client1 := &Client{send: make(chan []byte, 256)}
    client2 := &Client{send: make(chan []byte, 256)}
    hub.register <- client1
    hub.register <- client2

    // 메시지 브로드캐스트
    testMessage := []byte(`{"type":"TEST","payload":{}}`)
    hub.broadcast <- testMessage

    // 두 클라이언트 모두 수신 확인
    assert.Equal(t, testMessage, <-client1.send)
    assert.Equal(t, testMessage, <-client2.send)
}
```

### 2. Frontend Testing

**Component Tests**: React Testing Library

```tsx
// components/Timer.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { Timer } from './Timer';

test('displays initial time', () => {
    render(<Timer initialTime={60} />);
    expect(screen.getByText('60초')).toBeInTheDocument();
});

test('counts down every second', async () => {
    render(<Timer initialTime={3} />);

    expect(screen.getByText('3초')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('2초')).toBeInTheDocument(), { timeout: 1500 });
    await waitFor(() => expect(screen.getByText('1초')).toBeInTheDocument(), { timeout: 1500 });
});
```

**Hook Tests**: @testing-library/react-hooks

```tsx
// hooks/useWebSocket.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useWebSocket } from './useWebSocket';
import WS from 'jest-websocket-mock';

test('connects to WebSocket server', async () => {
    const server = new WS('ws://localhost:8080/ws/ABC123');

    const { result, waitForNextUpdate } = renderHook(() =>
        useWebSocket('ABC123')
    );

    await server.connected;
    await waitForNextUpdate();

    expect(result.current.isConnected).toBe(true);

    server.close();
});
```

## Performance Considerations

### 1. Concurrent Player Handling

**목표**: 20명 동시 플레이어 (4개 방 × 5명)

**Go 고루틴 활용**:
- 각 WebSocket 연결마다 2개 고루틴 (읽기/쓰기)
- Hub의 중앙 관리 고루틴 1개
- 총 41개 고루틴 (20×2 + 1) - Go의 경량 고루틴으로 무리 없음

**병목 지점**:
- Hub의 broadcast 채널 - 버퍼 크기 256으로 설정
- 메시지 직렬화 - encoding/json은 충분히 빠름 (프로파일링으로 확인 필요)

### 2. Message Batching (선택 사항)

현재 MVP에서는 불필요하나, 향후 확장 시 고려:

```go
// 100ms마다 배치 전송
type BatchedHub struct {
    messages chan Message
    ticker   *time.Ticker
}

func (h *BatchedHub) Run() {
    var batch []Message

    for {
        select {
        case msg := <-h.messages:
            batch = append(batch, msg)
        case <-h.ticker.C:
            if len(batch) > 0 {
                h.sendBatch(batch)
                batch = batch[:0]
            }
        }
    }
}
```

## Security Considerations

### 1. Input Validation

```go
// 닉네임 검증
func ValidateNickname(nickname string) error {
    if len(nickname) < 2 || len(nickname) > 20 {
        return errors.New("닉네임은 2-20자여야 합니다")
    }
    if !regexp.MustCompile(`^[a-zA-Z0-9가-힣]+$`).MatchString(nickname) {
        return errors.New("닉네임은 영문, 한글, 숫자만 가능합니다")
    }
    return nil
}
```

### 2. Rate Limiting (향후 고려)

MVP에서는 생략하나, 프로덕션 배포 시 필요:
- 방 생성: 1분당 5개
- 메시지 전송: 초당 10개
- WebSocket 연결: IP당 동시 5개

## Known Limitations

1. **단일 서버**: 수평 확장 불가 (Redis Pub/Sub로 해결 가능하나 MVP 범위 외)
2. **세션 휘발성**: 서버 재시작 시 모든 게임 손실 (요구사항에 명시됨)
3. **브라우저 호환성**: WebSocket 지원 브라우저 필요 (IE 11 이하 미지원)
4. **네트워크 단절 처리**: 재연결 로직 없음 (Phase 2에서 추가 가능)

## Conclusion

선택된 기술 스택 (Gin + Gorilla WebSocket + React 18)은:
- ✅ 헌법 원칙 IV (Go/React 기술 스택) 준수
- ✅ 헌법 원칙 V (단순성 우선) 준수
- ✅ 성능 목표 (20명 동시, 1초 이하 동기화) 달성 가능
- ✅ TDD 지원 (풍부한 테스팅 도구)

다음 단계: Phase 1에서 data-model.md, API contracts, quickstart.md 생성
