# Feature Specification: Room List and Join Enhancement

## Overview

**Feature ID**: 002
**Feature Name**: Room List and Join Enhancement
**Status**: Planning
**Priority**: High
**Created**: 2025-11-05

## Summary

Enhance the room joining experience by adding a public room list feature that allows users to browse and join available rooms without needing a room code. This improves discoverability and makes it easier for new players to find games.

## Problem Statement

### Current Issues

1. **Room Discovery**: Users must know the exact 6-character room code to join a game
2. **No Visibility**: Hosts cannot see if anyone is trying to find their room
3. **Poor UX**: New users have difficulty finding active games
4. **Manual Coordination**: Players must share room codes via external communication channels

### User Pain Points

- "I created a room but no one can find it"
- "I want to play but don't have a room code"
- "How do I know which rooms are available?"
- "I don't want to wait in an empty lobby"

## Goals

### Primary Goals

1. **Room Discovery**: Users can browse a list of available public rooms
2. **Quick Join**: Users can join rooms directly from the list without entering codes
3. **Room Visibility**: Display room status, player count, and availability
4. **Privacy Options**: Room hosts can choose to make their room public or private

### Secondary Goals

1. **Room Filtering**: Filter rooms by status (waiting, in-progress)
2. **Room Sorting**: Sort rooms by creation time, player count
3. **Auto-Refresh**: Room list updates automatically when rooms change
4. **Search**: Search rooms by custom room names (future enhancement)

### Non-Goals (Out of Scope)

- Room passwords
- Custom game modes or settings
- Player matchmaking algorithms
- Room chat features

## User Stories

### As a Room Host

```
As a room host,
I want to make my room publicly visible,
So that other players can find and join my game without me sharing a code.
```

**Acceptance Criteria**:
- [ ] I can toggle room visibility (public/private) when creating a room
- [ ] My room appears in the public room list when set to public
- [ ] I can see how many players are viewing the room list
- [ ] I can change room visibility after creation

### As a Player Looking to Join

```
As a player looking to join a game,
I want to see a list of available rooms,
So that I can easily find and join an active game.
```

**Acceptance Criteria**:
- [ ] I can view a list of all public rooms
- [ ] I see room code, player count, and max players for each room
- [ ] I can see room status (waiting/in-progress)
- [ ] I can join a room with one click
- [ ] The list updates when rooms change

### As a New User

```
As a new user,
I want to quickly find an active game,
So that I can start playing without coordination overhead.
```

**Acceptance Criteria**:
- [ ] I can see available rooms immediately on the home page
- [ ] I understand which rooms are joinable
- [ ] I can join a game within 2 clicks from home page
- [ ] I receive clear feedback if a room is full or unavailable

## Feature Requirements

### Functional Requirements

#### FR-1: Room List API

**Description**: Backend API endpoint to retrieve list of public rooms

**Requirements**:
- GET `/api/v1/rooms` - List all public rooms
- Query parameters:
  - `status`: Filter by status (WAITING, IN_PROGRESS)
  - `limit`: Maximum number of rooms to return (default: 50)
  - `offset`: Pagination offset (default: 0)
- Response includes:
  - Room code
  - Room status
  - Player count (current/max)
  - Creation time
  - Room visibility (public/private)
  - Host nickname (optional)
  - Game status (waiting/in-progress)

**Priority**: P0 (Must Have)

#### FR-2: Room Visibility Toggle

**Description**: Ability to set room as public or private

**Requirements**:
- Default: Rooms are public by default
- POST `/api/v1/rooms` includes `isPublic` boolean parameter
- PATCH `/api/v1/rooms/:roomCode/visibility` to change after creation
- Private rooms do not appear in public room list
- Private rooms can still be joined with room code

**Priority**: P0 (Must Have)

#### FR-3: Room List UI Component

**Description**: Frontend component displaying available rooms

**Requirements**:
- Display rooms in a card/list layout
- Show room code, player count, status
- "Join" button for each available room
- Visual indication for full rooms
- Visual indication for in-progress games
- Mobile-responsive design
- Empty state when no rooms available

**Priority**: P0 (Must Have)

#### FR-4: Quick Join Flow

**Description**: Streamlined joining from room list

**Requirements**:
- Single click join from room list
- Automatic navigation to room lobby
- Error handling for full rooms
- Error handling for deleted rooms
- Loading state during join operation

**Priority**: P0 (Must Have)

#### FR-5: Auto-Refresh Room List

**Description**: Real-time updates to room list

**Requirements**:
- Poll room list API every 5 seconds
- Update UI when rooms change
- Highlight newly created rooms
- Remove deleted/completed rooms
- Pause polling when user is not viewing the list

**Priority**: P1 (Should Have)

#### FR-6: Room Filtering

**Description**: Filter rooms by various criteria

**Requirements**:
- Filter by status (Waiting/In Progress)
- Filter by availability (Joinable only)
- Clear all filters option
- Filter state persists during refresh

**Priority**: P2 (Nice to Have)

### Non-Functional Requirements

#### NFR-1: Performance

- Room list API response time < 200ms
- Frontend renders list for 50 rooms in < 100ms
- Room list updates without page flicker
- Pagination for large number of rooms

#### NFR-2: Scalability

- Support up to 1000 concurrent public rooms
- Efficient database queries with proper indexing
- Implement pagination for large datasets

#### NFR-3: Security

- Rate limiting on room list endpoint (100 requests/minute per IP)
- Validate room visibility before allowing join
- Prevent spam room creation (max 3 rooms per user)

#### NFR-4: Usability

- Mobile-first responsive design
- Clear visual hierarchy
- Loading states for all async operations
- Error messages in Korean

#### NFR-5: Accessibility

- Keyboard navigation support
- Screen reader compatible
- ARIA labels for interactive elements
- Sufficient color contrast

## User Interface

### Wireframes

#### Home Page with Room List

```
+------------------------------------------+
|  두개의 방, 한개의 폭탄                    |
+------------------------------------------+
|                                          |
|  [ 방 만들기 ]  [ 새로고침 ]               |
|                                          |
|  공개 방 목록                              |
|  +------------------------------------+  |
|  | 🟢 ABC123  3/10명  [참가]           |  |
|  | 대기 중 · 방금 생성됨                 |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  | 🟡 XYZ789  5/10명  [참가]           |  |
|  | 게임 중 · 5분 전                     |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  | 🔴 DEF456  10/10명  [가득참]         |  |
|  | 대기 중 · 10분 전                    |  |
|  +------------------------------------+  |
|                                          |
|  또는                                    |
|                                          |
|  [ 방 코드 입력 ]  [ 방 참가 ]             |
|                                          |
+------------------------------------------+
```

#### Create Room with Visibility Toggle

```
+------------------------------------------+
|  방 만들기                                |
+------------------------------------------+
|                                          |
|  최대 플레이어 수                          |
|  [ 6 ] [ 8 ] [ 10 ] [ 12 ]              |
|                                          |
|  방 공개 설정                              |
|  [x] 공개 방 (다른 플레이어가 목록에서 볼 수 있음) |
|  [ ] 비공개 방 (코드를 아는 사람만 참가)      |
|                                          |
|  [ 방 만들기 ]  [ 취소 ]                  |
|                                          |
+------------------------------------------+
```

### Visual Design Guidelines

#### Room Status Colors

- 🟢 Green: Waiting, joinable
- 🟡 Yellow: In progress, spectating allowed (future)
- 🔴 Red: Full or unavailable

#### Typography

- Room code: Bold, monospace font
- Player count: Regular weight
- Status: Smaller font, secondary color
- Time: Smaller font, muted color

#### Spacing

- Card padding: 1rem
- Card gap: 0.5rem
- Mobile: Full width cards
- Desktop: Maximum 2 columns

## Technical Design

### Data Models

#### Room Model Extensions

```go
type Room struct {
    // ... existing fields ...
    IsPublic     bool      `json:"isPublic"`
    CreatedAt    time.Time `json:"createdAt"`
    UpdatedAt    time.Time `json:"updatedAt"`
    HostNickname string    `json:"hostNickname,omitempty"`
}
```

#### Room List Response

```typescript
interface RoomListItem {
    code: string;
    status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
    currentPlayers: number;
    maxPlayers: number;
    isPublic: boolean;
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
    hostNickname?: string;
}

interface RoomListResponse {
    rooms: RoomListItem[];
    total: number;
    limit: number;
    offset: number;
}
```

### API Endpoints

#### List Public Rooms

```
GET /api/v1/rooms
Query Parameters:
  - status: string (optional) - Filter by WAITING, IN_PROGRESS
  - limit: number (optional, default: 50, max: 100)
  - offset: number (optional, default: 0)

Response: 200 OK
{
    "rooms": [
        {
            "code": "ABC123",
            "status": "WAITING",
            "currentPlayers": 3,
            "maxPlayers": 10,
            "isPublic": true,
            "createdAt": "2025-11-05T10:00:00Z",
            "updatedAt": "2025-11-05T10:05:00Z",
            "hostNickname": "Player1"
        }
    ],
    "total": 25,
    "limit": 50,
    "offset": 0
}

Error Responses:
  - 429 Too Many Requests (rate limit exceeded)
  - 500 Internal Server Error
```

#### Update Room Visibility

```
PATCH /api/v1/rooms/:roomCode/visibility
Headers:
  - Content-Type: application/json

Body:
{
    "isPublic": true
}

Response: 200 OK
{
    "code": "ABC123",
    "isPublic": true,
    "message": "Room visibility updated successfully"
}

Error Responses:
  - 400 Bad Request (invalid body)
  - 401 Unauthorized (not room owner)
  - 404 Not Found (room doesn't exist)
```

#### Create Room (Updated)

```
POST /api/v1/rooms
Headers:
  - Content-Type: application/json

Body:
{
    "maxPlayers": 10,
    "isPublic": true  // NEW FIELD
}

Response: 201 Created
{
    "code": "ABC123",
    "status": "WAITING",
    "maxPlayers": 10,
    "isPublic": true,
    "players": [],
    "createdAt": "2025-11-05T10:00:00Z",
    "updatedAt": "2025-11-05T10:00:00Z"
}
```

### Database Schema Changes

```sql
-- Add new columns to rooms table
ALTER TABLE rooms ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE rooms ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rooms ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index for efficient querying
CREATE INDEX idx_rooms_public_status ON rooms(is_public, status) WHERE is_public = TRUE;
CREATE INDEX idx_rooms_created_at ON rooms(created_at DESC);
```

### Frontend Components

#### RoomList Component

```typescript
interface RoomListProps {
    status?: 'WAITING' | 'IN_PROGRESS';
    autoRefresh?: boolean;
    refreshInterval?: number; // milliseconds
}

export function RoomList({
    status,
    autoRefresh = true,
    refreshInterval = 5000
}: RoomListProps) {
    // Implementation
}
```

#### RoomListItem Component

```typescript
interface RoomListItemProps {
    room: RoomListItem;
    onJoin: (roomCode: string) => void;
}

export function RoomListItem({ room, onJoin }: RoomListItemProps) {
    // Implementation
}
```

### State Management

```typescript
// Room list state
interface RoomListState {
    rooms: RoomListItem[];
    loading: boolean;
    error: string | null;
    filter: {
        status?: 'WAITING' | 'IN_PROGRESS';
    };
    pagination: {
        total: number;
        limit: number;
        offset: number;
    };
}
```

## Implementation Plan

See [plan.md](./plan.md) for detailed implementation plan.

## Testing Plan

See [testing.md](./testing.md) for comprehensive testing plan.

## Security Considerations

### Rate Limiting

- Room list endpoint: 100 requests/minute per IP
- Room creation: 3 rooms per user simultaneously
- Room join: 10 attempts/minute per IP

### Data Validation

- Room visibility must be boolean
- Status filter must be valid enum value
- Pagination limits enforced (max 100 items)

### Privacy

- Private rooms never exposed in public API
- Room codes remain required for private rooms
- Host nickname optional (privacy setting)

### Abuse Prevention

- Automatic room cleanup after 24 hours inactive
- Flag and remove spam/inappropriate room names (future)
- Rate limit on room creation to prevent spam

## Rollout Plan

### Phase 1: Backend Implementation (Week 1)

- Implement room list API endpoint
- Add isPublic field to Room model
- Database migration for new fields
- Update existing create room endpoint
- Add visibility toggle endpoint

### Phase 2: Frontend Implementation (Week 1-2)

- Create RoomList component
- Create RoomListItem component
- Update HomePage with room list
- Add create room visibility toggle
- Implement auto-refresh

### Phase 3: Testing & Polish (Week 2)

- Unit tests for new components
- Integration tests for API
- E2E tests for join flow
- Performance testing
- Mobile responsiveness testing

### Phase 4: Deployment (Week 2-3)

- Deploy backend changes
- Run database migration
- Deploy frontend changes
- Monitor metrics and errors
- Gather user feedback

## Success Metrics

### Key Performance Indicators

1. **Adoption Rate**: % of users who use room list vs manual code entry
   - Target: 70% of joins via room list within 1 month

2. **Join Success Rate**: % of successful joins from room list
   - Target: 95% success rate

3. **Room Discovery Time**: Time from home page to joined room
   - Target: < 30 seconds average

4. **Room Fill Rate**: % of public rooms that reach 50%+ capacity
   - Target: 60% of public rooms

5. **API Performance**: Room list endpoint response time
   - Target: p95 < 200ms

### User Satisfaction Metrics

- User survey: "How easy was it to find and join a game?"
- Net Promoter Score (NPS) improvement
- Support ticket reduction for "can't find room" issues

## Risks & Mitigations

### Risk 1: Performance Degradation

**Risk**: Large number of rooms causes slow API responses

**Mitigation**:
- Implement pagination
- Add database indexes
- Cache room list for 5 seconds
- Limit to showing only active rooms (< 1 hour old)

### Risk 2: Spam Rooms

**Risk**: Users create many fake/spam rooms

**Mitigation**:
- Rate limit room creation (3 per user)
- Auto-cleanup inactive rooms
- Add room reporting feature (future)
- Monitor and flag unusual patterns

### Risk 3: Privacy Concerns

**Risk**: Users accidentally create public rooms with sensitive info

**Mitigation**:
- Clear UI for public/private toggle
- Confirmation dialog for public rooms
- Warning about public visibility
- Easy way to change to private

### Risk 4: Scalability

**Risk**: Feature doesn't scale to thousands of concurrent rooms

**Mitigation**:
- Design with pagination from day 1
- Use efficient database queries
- Consider Redis caching if needed
- Load testing before launch

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Room Search**: Search rooms by custom names
2. **Room Names**: Allow hosts to name their rooms
3. **Favorite Rooms**: Bookmark frequently joined rooms
4. **Room History**: Show recently joined rooms
5. **Player Stats**: Show player count trends

### Phase 3 Features

1. **Advanced Filtering**: Filter by player count, game duration
2. **Room Tags**: Custom tags for room types (beginner, advanced, etc.)
3. **Spectator Mode**: Join in-progress games as spectator
4. **Quick Join**: Auto-join best available room with one click
5. **Room Passwords**: Optional password protection

## Appendix

### Related Features

- Feature 001: Multiplayer Game Host (current implementation)
- Feature 003: Player Profiles (future)
- Feature 004: Game Statistics (future)

### References

- UI/UX Design: [Figma Link]
- Technical Architecture: [Architecture Doc]
- API Documentation: [OpenAPI Spec]

### Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-05 | 1.0 | Initial specification | Claude |

---

**Document Status**: Draft
**Last Updated**: 2025-11-05
**Next Review**: 2025-11-12
