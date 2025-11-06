# Testing Plan: Room List and Join Enhancement

## Overview

This document outlines the comprehensive testing strategy for Feature 002: Room List and Join Enhancement.

## Testing Strategy

### Testing Pyramid

```
              /\
             /  \        E2E Tests (10%)
            /____\       - User flows
           /      \      - Browser tests
          /________\     Integration Tests (20%)
         /          \    - API tests
        /____________\   - Database tests
       /              \
      /________________\ Unit Tests (70%)
                         - Component tests
                         - Service tests
                         - Handler tests
```

### Test Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: All critical user flows covered
- **Performance Tests**: Key scenarios benchmarked
- **Security Tests**: All security measures verified

---

## Unit Tests

### Backend Unit Tests

#### Test File Structure

```
backend/
├── internal/
│   ├── repository/
│   │   └── room_repository_test.go
│   ├── services/
│   │   └── room_service_test.go
│   ├── handlers/
│   │   └── room_handler_test.go
│   └── middleware/
│       └── rate_limiter_test.go
```

#### Repository Tests

**File**: `backend/internal/repository/room_repository_test.go`

```go
func TestListPublicRooms(t *testing.T) {
    tests := []struct {
        name           string
        setupRooms     []Room
        status         string
        limit          int
        offset         int
        expectedCount  int
        expectedTotal  int
    }{
        {
            name: "returns only public rooms",
            setupRooms: []Room{
                {Code: "ABC123", IsPublic: true, Status: "WAITING"},
                {Code: "XYZ789", IsPublic: false, Status: "WAITING"},
            },
            status: "",
            limit: 10,
            offset: 0,
            expectedCount: 1,
            expectedTotal: 1,
        },
        {
            name: "filters by status",
            setupRooms: []Room{
                {Code: "ABC123", IsPublic: true, Status: "WAITING"},
                {Code: "DEF456", IsPublic: true, Status: "IN_PROGRESS"},
            },
            status: "WAITING",
            limit: 10,
            offset: 0,
            expectedCount: 1,
            expectedTotal: 1,
        },
        {
            name: "respects pagination limit",
            setupRooms: createManyRooms(20),
            status: "",
            limit: 10,
            offset: 0,
            expectedCount: 10,
            expectedTotal: 20,
        },
        {
            name: "respects pagination offset",
            setupRooms: createManyRooms(20),
            status: "",
            limit: 10,
            offset: 10,
            expectedCount: 10,
            expectedTotal: 20,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}

func TestUpdateRoomVisibility(t *testing.T) {
    tests := []struct {
        name        string
        roomCode    string
        isPublic    bool
        expectError bool
    }{
        {
            name: "updates existing room to public",
            roomCode: "ABC123",
            isPublic: true,
            expectError: false,
        },
        {
            name: "updates existing room to private",
            roomCode: "ABC123",
            isPublic: false,
            expectError: false,
        },
        {
            name: "returns error for non-existent room",
            roomCode: "INVALID",
            isPublic: true,
            expectError: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}
```

**Test Coverage**:
- [ ] ListPublicRooms - returns only public rooms
- [ ] ListPublicRooms - filters by status correctly
- [ ] ListPublicRooms - respects pagination limit
- [ ] ListPublicRooms - respects pagination offset
- [ ] ListPublicRooms - returns empty array when no rooms
- [ ] ListPublicRooms - handles database errors
- [ ] UpdateRoomVisibility - updates successfully
- [ ] UpdateRoomVisibility - returns error for invalid room
- [ ] UpdateRoomVisibility - updates timestamp

#### Service Tests

**File**: `backend/internal/services/room_service_test.go`

```go
func TestGetPublicRooms(t *testing.T) {
    tests := []struct {
        name        string
        status      string
        limit       int
        offset      int
        expectError bool
    }{
        {
            name: "validates limit max value",
            status: "",
            limit: 200,
            offset: 0,
            expectError: true,
        },
        {
            name: "accepts valid parameters",
            status: "WAITING",
            limit: 50,
            offset: 0,
            expectError: false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}

func TestUpdateRoomVisibility(t *testing.T) {
    tests := []struct {
        name        string
        roomCode    string
        playerId    string
        isPublic    bool
        expectError bool
        errorType   string
    }{
        {
            name: "owner can update visibility",
            roomCode: "ABC123",
            playerId: "owner-id",
            isPublic: false,
            expectError: false,
        },
        {
            name: "non-owner cannot update visibility",
            roomCode: "ABC123",
            playerId: "other-id",
            isPublic: false,
            expectError: true,
            errorType: "unauthorized",
        },
        {
            name: "invalid room returns error",
            roomCode: "INVALID",
            playerId: "owner-id",
            isPublic: true,
            expectError: true,
            errorType: "not_found",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}
```

**Test Coverage**:
- [ ] GetPublicRooms - validates limit (max 100)
- [ ] GetPublicRooms - validates status values
- [ ] GetPublicRooms - calls repository correctly
- [ ] GetPublicRooms - transforms response correctly
- [ ] GetPublicRooms - handles repository errors
- [ ] UpdateRoomVisibility - verifies room exists
- [ ] UpdateRoomVisibility - verifies caller is owner
- [ ] UpdateRoomVisibility - broadcasts WebSocket update
- [ ] UpdateRoomVisibility - handles errors

#### Handler Tests

**File**: `backend/internal/handlers/room_handler_test.go`

```go
func TestListRoomsHandler(t *testing.T) {
    tests := []struct {
        name           string
        queryParams    map[string]string
        expectedStatus int
        expectedBody   interface{}
    }{
        {
            name: "returns room list successfully",
            queryParams: map[string]string{},
            expectedStatus: 200,
            expectedBody: RoomListResponse{},
        },
        {
            name: "accepts status filter",
            queryParams: map[string]string{"status": "WAITING"},
            expectedStatus: 200,
        },
        {
            name: "rejects invalid status",
            queryParams: map[string]string{"status": "INVALID"},
            expectedStatus: 400,
        },
        {
            name: "enforces rate limit",
            queryParams: map[string]string{},
            expectedStatus: 429, // after 100 requests
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}

func TestUpdateRoomVisibilityHandler(t *testing.T) {
    tests := []struct {
        name           string
        roomCode       string
        body           map[string]interface{}
        authToken      string
        expectedStatus int
    }{
        {
            name: "updates visibility successfully",
            roomCode: "ABC123",
            body: map[string]interface{}{"isPublic": false},
            authToken: "valid-owner-token",
            expectedStatus: 200,
        },
        {
            name: "returns 401 for non-owner",
            roomCode: "ABC123",
            body: map[string]interface{}{"isPublic": false},
            authToken: "valid-non-owner-token",
            expectedStatus: 401,
        },
        {
            name: "returns 404 for invalid room",
            roomCode: "INVALID",
            body: map[string]interface{}{"isPublic": false},
            authToken: "valid-owner-token",
            expectedStatus: 404,
        },
        {
            name: "returns 400 for invalid body",
            roomCode: "ABC123",
            body: map[string]interface{}{},
            authToken: "valid-owner-token",
            expectedStatus: 400,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}
```

**Test Coverage**:
- [ ] ListRooms - returns 200 with room list
- [ ] ListRooms - parses query parameters
- [ ] ListRooms - validates parameters
- [ ] ListRooms - applies rate limiting
- [ ] ListRooms - handles service errors
- [ ] UpdateRoomVisibility - returns 200 on success
- [ ] UpdateRoomVisibility - returns 401 for unauthorized
- [ ] UpdateRoomVisibility - returns 404 for not found
- [ ] UpdateRoomVisibility - validates request body

#### Middleware Tests

**File**: `backend/internal/middleware/rate_limiter_test.go`

```go
func TestRateLimiter(t *testing.T) {
    tests := []struct {
        name           string
        requests       int
        timeWindow     time.Duration
        limit          int
        expectBlocked  bool
    }{
        {
            name: "allows requests under limit",
            requests: 50,
            timeWindow: time.Minute,
            limit: 100,
            expectBlocked: false,
        },
        {
            name: "blocks requests over limit",
            requests: 101,
            timeWindow: time.Minute,
            limit: 100,
            expectBlocked: true,
        },
        {
            name: "resets after time window",
            requests: 150,
            timeWindow: time.Second,
            limit: 100,
            expectBlocked: false, // second batch allowed
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}
```

**Test Coverage**:
- [ ] Allows requests under limit
- [ ] Blocks requests over limit
- [ ] Returns 429 status code
- [ ] Resets after time window
- [ ] Per-IP tracking works
- [ ] Per-user tracking works

### Frontend Unit Tests

#### Component Tests

**File**: `frontend/src/components/__tests__/RoomList.test.tsx`

```typescript
describe('RoomList', () => {
    it('renders loading state initially', () => {
        render(<RoomList />);
        expect(screen.getByText(/로딩 중/i)).toBeInTheDocument();
    });

    it('renders room list after loading', async () => {
        const mockRooms = [
            {
                code: 'ABC123',
                status: 'WAITING',
                currentPlayers: 3,
                maxPlayers: 10,
                isPublic: true,
                createdAt: '2025-11-05T10:00:00Z',
            },
        ];

        vi.mocked(listRooms).mockResolvedValue({
            rooms: mockRooms,
            total: 1,
            limit: 50,
            offset: 0,
        });

        render(<RoomList />);

        await waitFor(() => {
            expect(screen.getByText('ABC123')).toBeInTheDocument();
        });
    });

    it('renders empty state when no rooms', async () => {
        vi.mocked(listRooms).mockResolvedValue({
            rooms: [],
            total: 0,
            limit: 50,
            offset: 0,
        });

        render(<RoomList />);

        await waitFor(() => {
            expect(screen.getByText(/공개 방이 없습니다/i)).toBeInTheDocument();
        });
    });

    it('refreshes room list every 5 seconds', async () => {
        vi.useFakeTimers();
        render(<RoomList autoRefresh={true} />);

        expect(listRooms).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(5000);
        expect(listRooms).toHaveBeenCalledTimes(2);

        vi.advanceTimersByTime(5000);
        expect(listRooms).toHaveBeenCalledTimes(3);

        vi.useRealTimers();
    });

    it('stops refreshing on unmount', () => {
        vi.useFakeTimers();
        const { unmount } = render(<RoomList autoRefresh={true} />);

        unmount();

        vi.advanceTimersByTime(10000);
        // Should not call after unmount
        expect(listRooms).toHaveBeenCalledTimes(1);

        vi.useRealTimers();
    });

    it('handles API errors gracefully', async () => {
        vi.mocked(listRooms).mockRejectedValue(new Error('Network error'));

        render(<RoomList />);

        await waitFor(() => {
            expect(screen.getByText(/오류가 발생했습니다/i)).toBeInTheDocument();
        });
    });
});
```

**File**: `frontend/src/components/__tests__/RoomListItem.test.tsx`

```typescript
describe('RoomListItem', () => {
    const mockRoom = {
        code: 'ABC123',
        status: 'WAITING' as const,
        currentPlayers: 3,
        maxPlayers: 10,
        isPublic: true,
        createdAt: '2025-11-05T10:00:00Z',
        updatedAt: '2025-11-05T10:00:00Z',
    };

    it('renders room information correctly', () => {
        render(<RoomListItem room={mockRoom} onJoin={vi.fn()} />);

        expect(screen.getByText('ABC123')).toBeInTheDocument();
        expect(screen.getByText(/3\/10명/i)).toBeInTheDocument();
    });

    it('shows green indicator for waiting rooms', () => {
        render(<RoomListItem room={mockRoom} onJoin={vi.fn()} />);

        const indicator = screen.getByTestId('status-indicator');
        expect(indicator).toHaveStyle({ backgroundColor: 'green' });
    });

    it('calls onJoin when join button clicked', () => {
        const onJoin = vi.fn();
        render(<RoomListItem room={mockRoom} onJoin={onJoin} />);

        fireEvent.click(screen.getByText('참가'));
        expect(onJoin).toHaveBeenCalledWith('ABC123');
    });

    it('disables join button for full rooms', () => {
        const fullRoom = { ...mockRoom, currentPlayers: 10, maxPlayers: 10 };
        render(<RoomListItem room={fullRoom} onJoin={vi.fn()} />);

        const button = screen.getByText('가득참');
        expect(button).toBeDisabled();
    });

    it('shows in-progress indicator for active games', () => {
        const activeRoom = { ...mockRoom, status: 'IN_PROGRESS' as const };
        render(<RoomListItem room={activeRoom} onJoin={vi.fn()} />);

        const indicator = screen.getByTestId('status-indicator');
        expect(indicator).toHaveStyle({ backgroundColor: 'yellow' });
    });
});
```

**File**: `frontend/src/components/__tests__/RoomVisibilityToggle.test.tsx`

```typescript
describe('RoomVisibilityToggle', () => {
    it('renders public and private options', () => {
        render(<RoomVisibilityToggle value={true} onChange={vi.fn()} />);

        expect(screen.getByLabelText(/공개 방/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/비공개 방/i)).toBeInTheDocument();
    });

    it('calls onChange when selection changes', () => {
        const onChange = vi.fn();
        render(<RoomVisibilityToggle value={true} onChange={onChange} />);

        fireEvent.click(screen.getByLabelText(/비공개 방/i));
        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('reflects current value', () => {
        render(<RoomVisibilityToggle value={true} onChange={vi.fn()} />);

        const publicRadio = screen.getByLabelText(/공개 방/i);
        expect(publicRadio).toBeChecked();
    });
});
```

**Test Coverage**:
- [ ] RoomList - renders loading state
- [ ] RoomList - renders room list
- [ ] RoomList - renders empty state
- [ ] RoomList - auto-refreshes
- [ ] RoomList - stops refresh on unmount
- [ ] RoomList - handles errors
- [ ] RoomListItem - renders room data
- [ ] RoomListItem - shows correct status
- [ ] RoomListItem - join button works
- [ ] RoomListItem - disables for full rooms
- [ ] RoomVisibilityToggle - renders options
- [ ] RoomVisibilityToggle - handles changes

#### API Service Tests

**File**: `frontend/src/services/__tests__/api.test.ts`

```typescript
describe('Room List API', () => {
    it('listRooms fetches rooms successfully', async () => {
        const mockResponse = {
            rooms: [],
            total: 0,
            limit: 50,
            offset: 0,
        };

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        });

        const result = await listRooms();
        expect(result).toEqual(mockResponse);
    });

    it('listRooms includes query parameters', async () => {
        await listRooms('WAITING', 10, 5);

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('status=WAITING'),
            expect.any(Object)
        );
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('limit=10'),
            expect.any(Object)
        );
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('offset=5'),
            expect.any(Object)
        );
    });

    it('updateRoomVisibility sends correct payload', async () => {
        await updateRoomVisibility('ABC123', false);

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/rooms/ABC123/visibility'),
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ isPublic: false }),
            })
        );
    });
});
```

---

## Integration Tests

### API Integration Tests

**File**: `backend/tests/integration/room_list_test.go`

```go
func TestRoomListIntegration(t *testing.T) {
    // Setup test server
    server := setupTestServer()
    defer server.Close()

    t.Run("Create room and list it", func(t *testing.T) {
        // Create a public room
        resp := createRoom(t, server, CreateRoomRequest{
            MaxPlayers: 10,
            IsPublic:   true,
        })
        assert.Equal(t, 201, resp.StatusCode)

        roomCode := parseRoomCode(resp.Body)

        // List rooms
        resp = listRooms(t, server, "", 50, 0)
        assert.Equal(t, 200, resp.StatusCode)

        var body RoomListResponse
        json.NewDecoder(resp.Body).Decode(&body)

        // Should include our room
        found := false
        for _, room := range body.Rooms {
            if room.Code == roomCode {
                found = true
                break
            }
        }
        assert.True(t, found, "Created room should appear in list")
    })

    t.Run("Private room not in list", func(t *testing.T) {
        // Create a private room
        resp := createRoom(t, server, CreateRoomRequest{
            MaxPlayers: 10,
            IsPublic:   false,
        })
        roomCode := parseRoomCode(resp.Body)

        // List rooms
        resp = listRooms(t, server, "", 50, 0)
        var body RoomListResponse
        json.NewDecoder(resp.Body).Decode(&body)

        // Should NOT include private room
        found := false
        for _, room := range body.Rooms {
            if room.Code == roomCode {
                found = true
                break
            }
        }
        assert.False(t, found, "Private room should not appear in list")
    })

    t.Run("Update visibility and verify list", func(t *testing.T) {
        // Create public room
        resp := createRoom(t, server, CreateRoomRequest{
            MaxPlayers: 10,
            IsPublic:   true,
        })
        roomCode := parseRoomCode(resp.Body)

        // Verify it's in list
        resp = listRooms(t, server, "", 50, 0)
        var body RoomListResponse
        json.NewDecoder(resp.Body).Decode(&body)
        assert.True(t, containsRoom(body.Rooms, roomCode))

        // Update to private
        resp = updateVisibility(t, server, roomCode, false)
        assert.Equal(t, 200, resp.StatusCode)

        // Verify it's not in list anymore
        resp = listRooms(t, server, "", 50, 0)
        json.NewDecoder(resp.Body).Decode(&body)
        assert.False(t, containsRoom(body.Rooms, roomCode))
    })

    t.Run("Rate limiting works", func(t *testing.T) {
        // Make 101 requests rapidly
        successCount := 0
        rateLimitedCount := 0

        for i := 0; i < 101; i++ {
            resp := listRooms(t, server, "", 50, 0)
            if resp.StatusCode == 200 {
                successCount++
            } else if resp.StatusCode == 429 {
                rateLimitedCount++
            }
        }

        // Should have hit rate limit
        assert.GreaterOrEqual(t, rateLimitedCount, 1, "Should hit rate limit")
        assert.LessOrEqual(t, successCount, 100, "Should allow max 100 requests")
    })
}
```

**Test Scenarios**:
- [ ] Create public room → appears in list
- [ ] Create private room → not in list
- [ ] Update visibility → list updates
- [ ] Filter by status → only matching rooms returned
- [ ] Pagination → correct subset returned
- [ ] Rate limiting → 429 after limit
- [ ] Full room → join fails with appropriate error
- [ ] Deleted room → removed from list
- [ ] In-progress game → shows correct status

---

## E2E Tests

### User Flow Tests

**Tools**: Playwright or Vitest + Testing Library

**File**: `frontend/tests/e2e/room-list.spec.ts`

```typescript
describe('Room List E2E', () => {
    test('User can see and join room from list', async ({ page }) => {
        // Navigate to home page
        await page.goto('http://localhost:8080');

        // Should see room list section
        await expect(page.locator('text=공개 방 목록')).toBeVisible();

        // Create a test room in background
        const roomCode = await createTestRoom({ isPublic: true });

        // Refresh to see new room
        await page.reload();

        // Room should appear in list
        await expect(page.locator(`text=${roomCode}`)).toBeVisible();

        // Click join button
        await page.click(`[data-room-code="${roomCode}"] button:has-text("참가")`);

        // Should navigate to room lobby
        await expect(page).toHaveURL(new RegExp(`/room/${roomCode}`));
        await expect(page.locator('text=대기실')).toBeVisible();
    });

    test('User creates public room and it appears in list', async ({ page }) => {
        await page.goto('http://localhost:8080');

        // Click create room
        await page.click('button:has-text("방 만들기")');

        // Should have public selected by default
        const publicRadio = page.locator('input[type="radio"][value="public"]');
        await expect(publicRadio).toBeChecked();

        // Create room
        await page.click('button:has-text("만들기")');

        // Note room code
        const roomCode = await page.locator('[data-testid="room-code"]').textContent();

        // Open new tab to check list
        const page2 = await page.context().newPage();
        await page2.goto('http://localhost:8080');

        // Room should be visible
        await expect(page2.locator(`text=${roomCode}`)).toBeVisible();
    });

    test('Private room not visible in list', async ({ page }) => {
        await page.goto('http://localhost:8080');

        // Create private room
        await page.click('button:has-text("방 만들기")');
        await page.click('input[type="radio"][value="private"]');
        await page.click('button:has-text("만들기")');

        const roomCode = await page.locator('[data-testid="room-code"]').textContent();

        // Check list in new tab
        const page2 = await page.context().newPage();
        await page2.goto('http://localhost:8080');

        // Room should NOT be visible
        await expect(page2.locator(`text=${roomCode}`)).not.toBeVisible();
    });

    test('Room list auto-refreshes', async ({ page }) => {
        await page.goto('http://localhost:8080');

        const initialCount = await page.locator('[data-testid="room-item"]').count();

        // Create room in background
        await createTestRoom({ isPublic: true });

        // Wait for auto-refresh (5 seconds + buffer)
        await page.waitForTimeout(6000);

        // Should see new room without manual refresh
        const newCount = await page.locator('[data-testid="room-item"]').count();
        expect(newCount).toBeGreaterThan(initialCount);
    });

    test('Full room shows disabled join button', async ({ page }) => {
        // Create room with max players
        const roomCode = await createTestRoom({
            maxPlayers: 2,
            isPublic: true
        });

        // Fill room to capacity
        await fillRoomToCapacity(roomCode, 2);

        await page.goto('http://localhost:8080');

        // Join button should be disabled
        const joinButton = page.locator(`[data-room-code="${roomCode}"] button`);
        await expect(joinButton).toBeDisabled();
        await expect(joinButton).toHaveText(/가득참/);
    });
});
```

**Test Coverage**:
- [ ] View room list on home page
- [ ] Join room from list
- [ ] Create public room and see it in list
- [ ] Create private room and verify not in list
- [ ] Room list auto-refreshes
- [ ] Full room shows disabled button
- [ ] Filter rooms by status
- [ ] Mobile responsive layout works
- [ ] Empty state displays correctly
- [ ] Error state displays with retry

---

## Performance Tests

### Load Testing

**Tools**: k6 or Apache JMeter

**File**: `tests/performance/room-list-load.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '1m', target: 50 },   // Ramp up to 50 users
        { duration: '3m', target: 50 },   // Stay at 50 users
        { duration: '1m', target: 100 },  // Ramp up to 100 users
        { duration: '3m', target: 100 },  // Stay at 100 users
        { duration: '1m', target: 0 },    // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
        http_req_failed: ['rate<0.01'],   // Less than 1% failures
    },
};

export default function () {
    // List rooms request
    const res = http.get('http://localhost:8080/api/v1/rooms');

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 200ms': (r) => r.timings.duration < 200,
        'has rooms array': (r) => JSON.parse(r.body).rooms !== undefined,
    });

    sleep(1);
}
```

**Performance Goals**:
- [ ] API endpoint response time p95 < 200ms
- [ ] API endpoint response time p99 < 500ms
- [ ] Frontend renders 50 rooms in < 100ms
- [ ] Auto-refresh doesn't block UI
- [ ] Handle 1000 concurrent public rooms
- [ ] Handle 100 requests/second
- [ ] Database query time < 50ms

### Database Performance

**Test Scenarios**:

1. **Query Performance with 1000 Rooms**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM rooms
   WHERE is_public = TRUE
   ORDER BY created_at DESC
   LIMIT 50;
   ```
   - [ ] Execution time < 50ms
   - [ ] Uses index

2. **Query Performance with Filters**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM rooms
   WHERE is_public = TRUE
   AND status = 'WAITING'
   ORDER BY created_at DESC
   LIMIT 50;
   ```
   - [ ] Execution time < 50ms
   - [ ] Uses composite index

3. **Pagination Performance**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM rooms
   WHERE is_public = TRUE
   ORDER BY created_at DESC
   LIMIT 50 OFFSET 500;
   ```
   - [ ] Execution time < 100ms
   - [ ] Consider cursor-based pagination if slow

---

## Security Tests

### Security Test Cases

**File**: `backend/tests/security/room_list_security_test.go`

```go
func TestSecurityMeasures(t *testing.T) {
    t.Run("Rate limiting enforced", func(t *testing.T) {
        // Make 101 requests from same IP
        // Verify 101st request returns 429
    })

    t.Run("Private rooms never exposed", func(t *testing.T) {
        // Create private room
        // List all rooms with different filters
        // Verify private room never appears
    })

    t.Run("SQL injection protection", func(t *testing.T) {
        // Try SQL injection in status parameter
        params := "status=WAITING'; DROP TABLE rooms; --"
        resp := listRooms(t, server, params, 50, 0)
        // Should not execute injection
        // Database should still exist
    })

    t.Run("Unauthorized visibility update blocked", func(t *testing.T) {
        // Create room as user A
        // Try to update as user B
        // Should return 401
    })

    t.Run("XSS protection in room data", func(t *testing.T) {
        // Create room with malicious nickname
        nickname := "<script>alert('xss')</script>"
        // List rooms
        // Verify script tags escaped in response
    })
}
```

**Test Coverage**:
- [ ] Rate limiting enforced (100/min)
- [ ] Private rooms never exposed in API
- [ ] SQL injection protection
- [ ] XSS protection for user-generated content
- [ ] CSRF protection (if applicable)
- [ ] Unauthorized access blocked
- [ ] Input validation on all parameters

---

## Accessibility Tests

### Accessibility Checklist

**Tools**: axe DevTools, Lighthouse, WAVE

- [ ] Keyboard navigation works
  - [ ] Tab through room list
  - [ ] Enter to join room
  - [ ] Focus indicators visible
- [ ] Screen reader compatible
  - [ ] Room list announced
  - [ ] Room status announced
  - [ ] Button labels clear
- [ ] ARIA labels present
  - [ ] `aria-label` on icon buttons
  - [ ] `role="list"` on room list
  - [ ] `role="listitem"` on room items
- [ ] Color contrast sufficient
  - [ ] Text on backgrounds: 4.5:1 ratio
  - [ ] Status indicators distinguishable
  - [ ] Focus indicators: 3:1 ratio
- [ ] Alt text for images (if any)
- [ ] Form labels associated
- [ ] Error messages accessible

---

## Cross-Browser Testing

### Browsers to Test

- [ ] Chrome (latest) - Windows
- [ ] Chrome (latest) - macOS
- [ ] Firefox (latest) - Windows
- [ ] Firefox (latest) - macOS
- [ ] Safari (latest) - macOS
- [ ] Safari (latest) - iOS
- [ ] Edge (latest) - Windows
- [ ] Chrome Mobile - Android

### Features to Verify

- [ ] Room list displays correctly
- [ ] Auto-refresh works
- [ ] Buttons interactive
- [ ] Layout responsive
- [ ] No console errors
- [ ] WebSocket fallbacks (if any)

---

## Mobile Testing

### Devices to Test

- [ ] iPhone 12/13/14 (iOS 15+)
- [ ] iPhone SE (small screen)
- [ ] iPad (tablet view)
- [ ] Samsung Galaxy S21/S22
- [ ] Google Pixel 6/7
- [ ] Small Android phone (320px width)

### Mobile-Specific Tests

- [ ] Touch targets adequate (44px min)
- [ ] Scrolling smooth
- [ ] Cards stack correctly
- [ ] Text readable
- [ ] No horizontal scroll
- [ ] Pull to refresh (if implemented)
- [ ] Works on slow connections

---

## Regression Testing

### Existing Features to Verify

After implementing room list feature, ensure these still work:

- [ ] Room creation (basic flow)
- [ ] Room joining with code
- [ ] Game start
- [ ] Role assignment
- [ ] WebSocket connection
- [ ] Player list
- [ ] Lobby functions
- [ ] Game flow
- [ ] Reset game

---

## Test Data Setup

### Test Room Fixtures

```go
var testRooms = []Room{
    {
        Code: "ABC123",
        Status: "WAITING",
        MaxPlayers: 10,
        IsPublic: true,
        Players: []Player{
            {ID: "1", Nickname: "Player1"},
            {ID: "2", Nickname: "Player2"},
        },
    },
    {
        Code: "XYZ789",
        Status: "IN_PROGRESS",
        MaxPlayers: 8,
        IsPublic: true,
        Players: createPlayers(5),
    },
    {
        Code: "FULL10",
        Status: "WAITING",
        MaxPlayers: 6,
        IsPublic: true,
        Players: createPlayers(6), // Full room
    },
    {
        Code: "SECRET",
        Status: "WAITING",
        MaxPlayers: 10,
        IsPublic: false, // Private room
        Players: createPlayers(3),
    },
}
```

---

## Test Execution Plan

### Phase 1: Unit Tests (Days 1-2)

```bash
# Backend unit tests
cd backend
go test ./internal/... -v -cover

# Frontend unit tests
cd frontend
npm test -- --coverage
```

### Phase 2: Integration Tests (Day 3)

```bash
# API integration tests
cd backend/tests/integration
go test -v

# Start test environment
docker-compose -f docker-compose.test.yml up
```

### Phase 3: E2E Tests (Day 4)

```bash
# E2E tests
cd frontend
npm run test:e2e
```

### Phase 4: Performance Tests (Day 5)

```bash
# Load testing
k6 run tests/performance/room-list-load.js

# Database performance
psql -f tests/performance/db-queries.sql
```

### Phase 5: Security & Accessibility (Day 6)

```bash
# Security tests
go test ./backend/tests/security -v

# Accessibility audit
npm run lighthouse
```

---

## Success Criteria

### Test Completion Criteria

- [ ] All unit tests pass (>80% coverage)
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Performance benchmarks met
- [ ] Security tests pass
- [ ] Accessibility score > 90
- [ ] Cross-browser tests pass
- [ ] Mobile tests pass
- [ ] No critical bugs found
- [ ] Regression tests pass

### Quality Gates

Before deployment:

1. **Code Coverage**: >80% for both backend and frontend
2. **Performance**: p95 < 200ms for API, frontend renders < 100ms
3. **Security**: All security tests pass, no vulnerabilities
4. **Accessibility**: Lighthouse score > 90
5. **Bugs**: No P0 (critical) or P1 (high) bugs open
6. **Documentation**: All tests documented

---

## Test Reports

### Report Template

```markdown
# Test Report: Room List Feature

**Date**: 2025-11-XX
**Tester**: [Name]
**Environment**: [Staging/Production]

## Summary

- Total Tests: XXX
- Passed: XXX
- Failed: XXX
- Skipped: XXX
- Coverage: XX%

## Test Results by Category

### Unit Tests
- Backend: XXX/XXX passed (XX%)
- Frontend: XXX/XXX passed (XX%)

### Integration Tests
- API Tests: XXX/XXX passed
- Database Tests: XXX/XXX passed

### E2E Tests
- User Flows: XXX/XXX passed

### Performance Tests
- Load Testing: [Pass/Fail]
- API Response Time: XXXms (Target: <200ms)
- Frontend Render: XXXms (Target: <100ms)

### Security Tests
- All Passed: [Yes/No]
- Vulnerabilities Found: XX

### Accessibility Tests
- Lighthouse Score: XX/100

## Issues Found

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| 1  | High     | ...         | Open   |

## Recommendations

1. ...
2. ...

## Sign-off

- [ ] All critical tests pass
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Ready for deployment

**Approved by**: _____________
**Date**: _____________
```

---

**Document Status**: Final
**Last Updated**: 2025-11-05
**Created By**: Claude
