# WebSocket Architecture Documentation

## Overview

This document describes the WebSocket architecture used in the Two Rooms and a Boom application, including the evolution of solutions to handle page navigation without disconnecting players.

## Problem Statement

When navigating between lobby and game views, the original implementation caused unwanted WebSocket disconnections:

1. User navigates from `/lobby/ROOMCODE` to `/game/ROOMCODE`
2. React Router unmounts LobbyPage component
3. Component cleanup closes WebSocket connection
4. Backend broadcasts `PLAYER_DISCONNECTED` to all other players
5. GamePage mounts and creates a NEW WebSocket connection
6. Backend broadcasts `PLAYER_JOINED` (looks like reconnection)
7. During the gap, `ROLE_ASSIGNED` messages can be missed

## Solution Evolution

### Solution 1: Shared WebSocket Connections (Current Implementation)

**Implementation**: Module-level Map storing WebSocket connections that can be shared across components.

**Location**: `frontend/src/hooks/useWebSocket.ts`

**How It Works**:
```typescript
// Shared connection storage
const sharedConnections = new Map<string, {
  ws: WebSocket;
  subscribers: Map<number, (message: WSMessage) => void>;
  subscriberStates: Map<number, StateSetters>;
  isConnected: boolean;
  playerId: string;
  reconnectAttempts: number;
}>();

// Connection key: unique per room+player
const connectionKey = `${roomCode}-${playerId}`;

// When component mounts:
// - If connection exists, reuse it and add subscriber
// - If not, create new connection

// When component unmounts:
// - Remove subscriber
// - Only close WebSocket if no more subscribers (count = 0)
```

**Advantages**:
- ✅ WebSocket persists during navigation
- ✅ No `PLAYER_DISCONNECTED` messages
- ✅ Maintains existing URL structure

**Disadvantages**:
- ❌ Complex implementation with subscriber pattern
- ❌ Requires 100ms delay between `GAME_STARTED` and `ROLE_ASSIGNED` to handle race conditions
- ❌ More difficult to debug and maintain

**Files Modified**:
- `frontend/src/hooks/useWebSocket.ts` - Added shared connection logic
- `backend/internal/services/game_service.go` - Added 100ms delay to prevent race condition
- `frontend/src/pages/LobbyPage.tsx` - Fixed infinite loop in useEffect dependencies

### Solution 2: Query Parameter Approach (Recommended)

**Implementation**: Use single route with query parameters to distinguish views.

**Proposed Routes**:
- Lobby view: `/room/ROOMCODE?view=lobby`
- Game view: `/room/ROOMCODE?view=game`

**How It Would Work**:
```typescript
// Single RoomPage component
function RoomPage() {
  const { roomCode } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'lobby';

  // Single WebSocket connection for the entire component lifecycle
  const { isConnected, lastMessage } = useWebSocket(roomCode, playerId);

  // Conditional rendering based on view
  if (view === 'game') {
    return <GameView role={role} team={team} currentRoom={currentRoom} />;
  }
  return <LobbyView players={players} isOwner={isOwner} />;
}

// Navigation becomes simple:
setSearchParams({ view: 'game' }); // No unmount!
```

**Advantages**:
- ✅ **No component unmount** - same component stays mounted
- ✅ **WebSocket stays connected naturally** - no complex sharing logic needed
- ✅ **No race conditions** - no need for artificial delays
- ✅ **Simpler code** - removes ~100 lines of shared connection logic
- ✅ **Better maintainability** - single source of truth for room state
- ✅ **Conceptually correct** - it's the same room, just different views
- ✅ **Browser back button** works more intuitively

**Disadvantages**:
- ⚠️ Requires refactoring existing routes
- ⚠️ URL semantics slightly less clear (`?view=game` vs `/game/ROOMCODE`)
- ⚠️ Need to update all navigation calls and tests

**Migration Effort**:
- **Estimated**: 2-3 hours
- **Files to Change**:
  - Merge `LobbyPage.tsx` and `GamePage.tsx` into `RoomPage.tsx`
  - Update `App.tsx` routes
  - Simplify `useWebSocket.ts` (remove shared connection logic)
  - Update all `navigate()` calls
  - Update tests
  - Remove 100ms delay from backend

## Current Issues and Workarounds

### Issue 1: Race Condition with ROLE_ASSIGNED

**Problem**: Backend sends `GAME_STARTED` and `ROLE_ASSIGNED` messages immediately in sequence. If client is navigating during this time, `ROLE_ASSIGNED` can be sent before GamePage subscribes to the WebSocket.

**Current Workaround**: 100ms delay in `backend/internal/services/game_service.go:221`

```go
s.hub.BroadcastGameStarted(roomCode, gameStartedPayload)

// Wait a bit to allow clients to navigate and subscribe
time.Sleep(100 * time.Millisecond)

// Send ROLE_ASSIGNED to each player
for _, player := range room.Players {
    s.hub.SendRoleAssigned(roomCode, player.ID, roleAssignedPayload)
}
```

**Better Solution**: Query parameter approach eliminates the race condition entirely.

### Issue 2: LobbyPage Infinite Loop

**Problem**: `useEffect` dependency array included `room` state, which the effect itself modifies, causing infinite loop.

**Solution**: Remove `room` and `currentPlayer` from dependencies, use functional state updates:

```typescript
// Before (infinite loop):
useEffect(() => {
  if (lastMessage.type === 'PLAYER_JOINED') {
    setRoom(prev => ({ ...prev, players: [...prev.players, player] }));
  }
}, [lastMessage, room]); // ❌ room changes → effect runs → room changes → ...

// After (fixed):
useEffect(() => {
  if (lastMessage.type === 'PLAYER_JOINED') {
    setRoom(prev => ({ ...prev, players: [...prev.players, player] }));
  }
}, [lastMessage]); // ✅ only runs when lastMessage changes
```

## Backend WebSocket Broadcasting

### Message Flow

**Location**: `backend/internal/websocket/hub.go`

1. **BroadcastGameStarted** (line 232): Sends `GAME_STARTED` to all players in room
2. **SendRoleAssigned** (line 248): Sends `ROLE_ASSIGNED` to specific player via `SendToClient`
3. **SendToClient** (line 113): Finds client by playerID and sends message

**Key Implementation Detail**:
```go
func (h *Hub) SendToClient(roomCode, playerID string, message []byte) {
    h.mu.RLock()
    clients := h.rooms[roomCode]
    h.mu.RUnlock()

    for client := range clients {
        if client.playerID == playerID {
            select {
            case client.send <- message:
            default:
                // Client buffer full
            }
            break // ⚠️ Sends to first matching client and breaks
        }
    }
}
```

**Important**: If multiple WebSocket connections exist for the same playerID (during transition), only the first one receives the message.

### PLAYER_DISCONNECTED Broadcasting

**Location**: `backend/internal/websocket/hub.go:64-80`

When a WebSocket connection closes:
1. `ReadPump` exits and sends client to `unregister` channel
2. Hub removes client from room
3. Broadcasts `PLAYER_DISCONNECTED` to all remaining clients
4. Adds player to `disconnected` map with 30-second grace period

**With Shared Connections**: This is prevented because the WebSocket doesn't close during navigation.

## Test Coverage

### Integration Test for Navigation Persistence

**Location**: `frontend/src/hooks/__tests__/useWebSocket.test.ts:217-271`

```typescript
it('should persist WebSocket connection during navigation (shared connection)', async () => {
  // Mount LobbyPage (subscriber 1)
  const { result: lobbyResult, unmount: unmountLobby } = renderHook(() =>
    useWebSocket('ABC123', 'player-1')
  );

  // Verify 1 WebSocket created
  expect(MockWebSocket.instances.length).toBe(1);

  // Mount GamePage (subscriber 2) - simulates navigation
  const { result: gameResult } = renderHook(() =>
    useWebSocket('ABC123', 'player-1')
  );

  // KEY: Still only 1 WebSocket (reused!)
  expect(MockWebSocket.instances.length).toBe(1);

  // Unmount LobbyPage
  unmountLobby();

  // KEY: WebSocket still open (GamePage subscribed)
  expect(firstWS.readyState).toBe(MockWebSocket.OPEN);
  expect(gameResult.current.isConnected).toBe(true);
});
```

**Test Output**:
```
WebSocket connected: ABC123-player-1
WebSocket: Reusing existing connection for ABC123-player-1, subscribers: 2
WebSocket: Subscriber disconnected from ABC123-player-1, remaining: 1  ← KEY!
```

### Current Test Results

- **Frontend**: 91/91 tests passing (100%)
  - 10 test files
  - Includes navigation persistence test

- **Backend**: All integration tests passing
  - Services tests
  - WebSocket tests
  - Integration tests

## Recommendations

### ~~Short Term (Current State)~~ DEPRECATED

~~✅ **Keep shared connection implementation**~~ - This approach has been deprecated in favor of the query parameter solution.

### **Current Implementation** (As of 2025-11-04)

✅ **Query parameter approach** - Migrated from path-based routing to query parameters:
- Routes changed from `/lobby/:roomCode` and `/game/:roomCode` to `/room/:roomCode?view=lobby` and `/room/:roomCode?view=game`
- Single `RoomPage` component with conditional rendering based on `view` parameter
- WebSocket connection naturally persists during view changes
- Removed 100ms delay workaround from backend
- Simplified `useWebSocket.ts` by removing shared connection logic

**Benefits Realized**:
- ✅ Eliminates root cause of disconnection problem
- ✅ Removed ~100 lines of complex shared connection code
- ✅ No artificial delays needed
- ✅ Better architectural design
- ✅ Easier to maintain and debug

**Migration Checklist**:
- [x] Create new `RoomPage.tsx` component
- [x] Implement view switching with `useSearchParams`
- [x] Extract `LobbyView` and `GameView` sub-components
- [x] Update routes in `App.tsx`
- [x] Update all `navigate()` calls to use `setSearchParams()`
- [x] Simplify `useWebSocket.ts` (remove shared connection logic)
- [x] Remove 100ms delay from `game_service.go`
- [x] Update tests for new route structure
- [x] Test navigation in all scenarios
- [x] Update documentation

## Related Documents

- `WEBSOCKET_PLAYER_DISCONNECTED_REPORT.md` - Detailed analysis of the original issue
- `specs/001-multiplayer-game-host/contracts/api-spec.yaml` - WebSocket message contracts
- `specs/001-multiplayer-game-host/tasks.md` - Implementation tasks

## Change History

- **2025-11-02**: Initial shared connection implementation
- **2025-11-04**: Added 100ms delay workaround for race condition
- **2025-11-04**: Fixed LobbyPage infinite loop
- **2025-11-04**: Documented query parameter recommendation
- **2025-11-04**: Migrated to query parameter approach - deprecated shared connection implementation
