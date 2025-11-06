# Implementation Plan: Room List and Join Enhancement

## Overview

This document outlines the step-by-step implementation plan for Feature 002: Room List and Join Enhancement.

## Phase Overview

| Phase | Duration | Focus | Dependencies |
|-------|----------|-------|--------------|
| Phase 1 | 2-3 days | Backend Implementation | None |
| Phase 2 | 3-4 days | Frontend Implementation | Phase 1 |
| Phase 3 | 2-3 days | Testing & Polish | Phase 2 |
| Phase 4 | 1-2 days | Deployment | Phase 3 |

**Total Estimated Time**: 8-12 days

---

## Phase 1: Backend Implementation

### Task 1.1: Database Schema Changes

**Estimated Time**: 2 hours

**Description**: Add new fields to support room visibility and timestamps

**Steps**:

1. Create migration file: `migrations/003_add_room_visibility.sql`
2. Add columns:
   ```sql
   ALTER TABLE rooms ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
   ALTER TABLE rooms ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
   ALTER TABLE rooms ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
   ```
3. Create indexes:
   ```sql
   CREATE INDEX idx_rooms_public_status ON rooms(is_public, status)
   WHERE is_public = TRUE;
   CREATE INDEX idx_rooms_created_at ON rooms(created_at DESC);
   ```
4. Test migration up/down

**Files to Modify**:
- `backend/migrations/003_add_room_visibility.sql` (new)

**Acceptance Criteria**:
- [ ] Migration runs successfully
- [ ] Indexes created correctly
- [ ] Existing data migrates with default values
- [ ] Rollback works correctly

---

### Task 1.2: Update Room Model

**Estimated Time**: 1 hour

**Description**: Add new fields to Room struct

**Steps**:

1. Open `backend/internal/models/room.go`
2. Add new fields:
   ```go
   type Room struct {
       // ... existing fields ...
       IsPublic     bool      `json:"isPublic"`
       CreatedAt    time.Time `json:"createdAt"`
       UpdatedAt    time.Time `json:"updatedAt"`
       HostNickname string    `json:"hostNickname,omitempty"`
   }
   ```
3. Update constructor to set default values
4. Update JSON serialization

**Files to Modify**:
- `backend/internal/models/room.go`

**Acceptance Criteria**:
- [ ] Fields serialize correctly to JSON
- [ ] Default values set properly
- [ ] No breaking changes to existing code

---

### Task 1.3: Implement Room List Repository Method

**Estimated Time**: 3 hours

**Description**: Add database methods for fetching public rooms

**Steps**:

1. Open `backend/internal/repository/room_repository.go`
2. Add method `ListPublicRooms`:
   ```go
   func (r *RoomRepository) ListPublicRooms(
       status string,
       limit int,
       offset int
   ) ([]models.Room, int, error)
   ```
3. Implement SQL query with filtering
4. Handle pagination
5. Add total count query
6. Add unit tests

**Files to Modify**:
- `backend/internal/repository/room_repository.go`
- `backend/internal/repository/room_repository_test.go` (new)

**Acceptance Criteria**:
- [ ] Query returns correct rooms based on filters
- [ ] Pagination works correctly
- [ ] Total count accurate
- [ ] Unit tests pass with 80%+ coverage

---

### Task 1.4: Implement Room Visibility Update Repository Method

**Estimated Time**: 1 hour

**Description**: Add method to update room visibility

**Steps**:

1. Add method `UpdateRoomVisibility`:
   ```go
   func (r *RoomRepository) UpdateRoomVisibility(
       roomCode string,
       isPublic bool
   ) error
   ```
2. Implement SQL UPDATE
3. Update UpdatedAt timestamp
4. Add unit tests

**Files to Modify**:
- `backend/internal/repository/room_repository.go`
- `backend/internal/repository/room_repository_test.go`

**Acceptance Criteria**:
- [ ] Visibility updates correctly
- [ ] UpdatedAt timestamp set
- [ ] Unit tests pass

---

### Task 1.5: Implement Room List Service Layer

**Estimated Time**: 2 hours

**Description**: Business logic for room list feature

**Steps**:

1. Open `backend/internal/services/room_service.go`
2. Add method `GetPublicRooms`:
   ```go
   func (s *RoomService) GetPublicRooms(
       status string,
       limit int,
       offset int
   ) (*RoomListResponse, error)
   ```
3. Validate parameters (limit max 100)
4. Call repository method
5. Transform data for API response
6. Add unit tests

**Files to Modify**:
- `backend/internal/services/room_service.go`
- `backend/internal/services/room_service_test.go`

**Acceptance Criteria**:
- [ ] Parameter validation works
- [ ] Returns correct response structure
- [ ] Unit tests pass

---

### Task 1.6: Update Create Room Service

**Estimated Time**: 1 hour

**Description**: Add isPublic parameter to room creation

**Steps**:

1. Update `CreateRoom` method signature
2. Accept `isPublic` parameter
3. Set field in Room model
4. Update tests

**Files to Modify**:
- `backend/internal/services/room_service.go`
- `backend/internal/services/room_service_test.go`

**Acceptance Criteria**:
- [ ] isPublic parameter accepted
- [ ] Default value is true
- [ ] Tests updated

---

### Task 1.7: Implement Room Visibility Update Service

**Estimated Time**: 1.5 hours

**Description**: Service method to update room visibility

**Steps**:

1. Add method `UpdateRoomVisibility`
2. Verify room exists
3. Verify caller is owner
4. Call repository update
5. Broadcast update to room members (WebSocket)
6. Add tests

**Files to Modify**:
- `backend/internal/services/room_service.go`
- `backend/internal/services/room_service_test.go`

**Acceptance Criteria**:
- [ ] Owner verification works
- [ ] Room not found handled
- [ ] WebSocket notification sent
- [ ] Tests pass

---

### Task 1.8: Implement GET /api/v1/rooms Endpoint

**Estimated Time**: 2 hours

**Description**: API endpoint for listing public rooms

**Steps**:

1. Open `backend/internal/handlers/room_handler.go`
2. Add `ListRooms` handler:
   ```go
   func (h *RoomHandler) ListRooms(c *gin.Context)
   ```
3. Parse query parameters (status, limit, offset)
4. Call service method
5. Return JSON response
6. Add rate limiting middleware
7. Add integration tests

**Files to Modify**:
- `backend/internal/handlers/room_handler.go`
- `backend/internal/handlers/room_handler_test.go`
- `backend/cmd/server/main.go` (route registration)

**Acceptance Criteria**:
- [ ] Endpoint returns 200 OK with room list
- [ ] Query parameters parsed correctly
- [ ] Rate limiting works (100/min)
- [ ] Integration tests pass

---

### Task 1.9: Implement PATCH /api/v1/rooms/:code/visibility Endpoint

**Estimated Time**: 1.5 hours

**Description**: API endpoint to update room visibility

**Steps**:

1. Add `UpdateRoomVisibility` handler
2. Parse room code from URL
3. Parse request body
4. Verify authentication/ownership
5. Call service method
6. Return updated room data
7. Add integration tests

**Files to Modify**:
- `backend/internal/handlers/room_handler.go`
- `backend/internal/handlers/room_handler_test.go`
- `backend/cmd/server/main.go`

**Acceptance Criteria**:
- [ ] Endpoint works for authorized users
- [ ] Returns 401 for non-owners
- [ ] Returns 404 for invalid room
- [ ] Integration tests pass

---

### Task 1.10: Update POST /api/v1/rooms Endpoint

**Estimated Time**: 1 hour

**Description**: Add isPublic parameter to room creation

**Steps**:

1. Update `CreateRoom` handler
2. Parse `isPublic` from request body
3. Pass to service layer
4. Update API documentation
5. Update tests

**Files to Modify**:
- `backend/internal/handlers/room_handler.go`
- `backend/internal/handlers/room_handler_test.go`
- `backend/api/openapi.yaml`

**Acceptance Criteria**:
- [ ] isPublic parameter accepted
- [ ] Defaults to true if not provided
- [ ] Tests updated

---

### Task 1.11: Add Rate Limiting Middleware

**Estimated Time**: 2 hours

**Description**: Implement rate limiting for room endpoints

**Steps**:

1. Create `backend/internal/middleware/rate_limiter.go`
2. Implement token bucket algorithm or use library
3. Configure limits:
   - Room list: 100/minute per IP
   - Room creation: 3 simultaneous per user
   - Room join: 10/minute per IP
4. Add tests

**Files to Create**:
- `backend/internal/middleware/rate_limiter.go`
- `backend/internal/middleware/rate_limiter_test.go`

**Acceptance Criteria**:
- [ ] Rate limits enforced
- [ ] Returns 429 Too Many Requests
- [ ] Resets after time window
- [ ] Tests pass

---

## Phase 2: Frontend Implementation

### Task 2.1: Create Room List Types

**Estimated Time**: 30 minutes

**Description**: TypeScript types for room list feature

**Steps**:

1. Open `frontend/src/types/game.types.ts`
2. Add types:
   ```typescript
   interface RoomListItem {
       code: string;
       status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
       currentPlayers: number;
       maxPlayers: number;
       isPublic: boolean;
       createdAt: string;
       updatedAt: string;
       hostNickname?: string;
   }

   interface RoomListResponse {
       rooms: RoomListItem[];
       total: number;
       limit: number;
       offset: number;
   }
   ```

**Files to Modify**:
- `frontend/src/types/game.types.ts`

**Acceptance Criteria**:
- [ ] Types compile without errors
- [ ] Types match backend API

---

### Task 2.2: Create Room List API Service

**Estimated Time**: 1 hour

**Description**: API client methods for room list

**Steps**:

1. Open `frontend/src/services/api.ts`
2. Add methods:
   ```typescript
   export async function listRooms(
       status?: string,
       limit?: number,
       offset?: number
   ): Promise<RoomListResponse>

   export async function updateRoomVisibility(
       roomCode: string,
       isPublic: boolean
   ): Promise<Room>
   ```
3. Implement with proper error handling

**Files to Modify**:
- `frontend/src/services/api.ts`

**Acceptance Criteria**:
- [ ] API methods work correctly
- [ ] Error handling implemented
- [ ] TypeScript types correct

---

### Task 2.3: Update Create Room API

**Estimated Time**: 30 minutes

**Description**: Add isPublic parameter to createRoom

**Steps**:

1. Update `createRoom` function signature
2. Add `isPublic` to request body
3. Update return type

**Files to Modify**:
- `frontend/src/services/api.ts`

**Acceptance Criteria**:
- [ ] Parameter added
- [ ] Default value handled
- [ ] Types updated

---

### Task 2.4: Create RoomListItem Component

**Estimated Time**: 2 hours

**Description**: Component for individual room in list

**Steps**:

1. Create `frontend/src/components/RoomListItem.tsx`
2. Props: `room`, `onJoin`
3. Display:
   - Room code (bold, monospace)
   - Status indicator (colored dot)
   - Player count (current/max)
   - Time ago (e.g., "5분 전")
   - Join button
4. Handle full rooms (disable button)
5. Mobile responsive styling
6. Add unit tests

**Files to Create**:
- `frontend/src/components/RoomListItem.tsx`
- `frontend/src/components/__tests__/RoomListItem.test.tsx`

**Acceptance Criteria**:
- [ ] Renders room data correctly
- [ ] Join button works
- [ ] Shows correct status colors
- [ ] Mobile responsive
- [ ] Tests pass

---

### Task 2.5: Create RoomList Component

**Estimated Time**: 3 hours

**Description**: Main component for displaying room list

**Steps**:

1. Create `frontend/src/components/RoomList.tsx`
2. Features:
   - Fetch rooms on mount
   - Auto-refresh every 5 seconds
   - Filter by status
   - Show loading state
   - Show empty state
   - Handle errors
   - Mobile responsive grid
3. Use `useEffect` for polling
4. Cleanup on unmount
5. Add unit tests

**Files to Create**:
- `frontend/src/components/RoomList.tsx`
- `frontend/src/components/__tests__/RoomList.test.tsx`

**Acceptance Criteria**:
- [ ] Fetches and displays rooms
- [ ] Auto-refresh works
- [ ] Filters work
- [ ] Loading/empty states work
- [ ] Mobile responsive
- [ ] Tests pass

---

### Task 2.6: Create RoomVisibilityToggle Component

**Estimated Time**: 1.5 hours

**Description**: Toggle for room visibility in create dialog

**Steps**:

1. Create `frontend/src/components/RoomVisibilityToggle.tsx`
2. Radio buttons or toggle switch
3. Labels:
   - Public: "공개 방 (다른 플레이어가 목록에서 볼 수 있음)"
   - Private: "비공개 방 (코드를 아는 사람만 참가)"
4. Props: `value`, `onChange`
5. Mobile responsive
6. Add tests

**Files to Create**:
- `frontend/src/components/RoomVisibilityToggle.tsx`
- `frontend/src/components/__tests__/RoomVisibilityToggle.test.tsx`

**Acceptance Criteria**:
- [ ] Toggle works
- [ ] Labels clear
- [ ] Mobile friendly
- [ ] Tests pass

---

### Task 2.7: Update HomePage with Room List

**Estimated Time**: 2 hours

**Description**: Integrate room list into home page

**Steps**:

1. Open `frontend/src/pages/HomePage.tsx`
2. Add RoomList component
3. Layout:
   - "방 만들기" button at top
   - Room list below
   - "또는" divider
   - Manual join input at bottom
4. Handle join from list (navigate to room)
5. Mobile responsive layout
6. Update tests

**Files to Modify**:
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/__tests__/HomePage.test.tsx`

**Acceptance Criteria**:
- [ ] Room list displays on home page
- [ ] Join from list works
- [ ] Manual join still works
- [ ] Mobile responsive
- [ ] Tests pass

---

### Task 2.8: Update Create Room Dialog

**Estimated Time**: 1.5 hours

**Description**: Add visibility toggle to room creation

**Steps**:

1. Add RoomVisibilityToggle to HomePage
2. State for isPublic (default true)
3. Pass to createRoom API call
4. Update UI flow
5. Update tests

**Files to Modify**:
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/__tests__/HomePage.test.tsx`

**Acceptance Criteria**:
- [ ] Toggle visible in create flow
- [ ] Default is public
- [ ] Value passed to API
- [ ] Tests pass

---

### Task 2.9: Add Room Settings Page (Optional)

**Estimated Time**: 2 hours

**Description**: Page for room owner to manage settings

**Steps**:

1. Create `frontend/src/pages/RoomSettingsPage.tsx`
2. Add visibility toggle
3. Add save button
4. Show success/error messages
5. Only accessible by owner
6. Mobile responsive

**Files to Create**:
- `frontend/src/pages/RoomSettingsPage.tsx`
- `frontend/src/pages/__tests__/RoomSettingsPage.test.tsx`

**Priority**: P2 (Nice to Have)

**Acceptance Criteria**:
- [ ] Owner can change visibility
- [ ] Non-owners see error
- [ ] Changes save correctly
- [ ] Mobile responsive

---

### Task 2.10: Add Loading and Error States

**Estimated Time**: 1.5 hours

**Description**: Polish UI with proper states

**Steps**:

1. Loading skeleton for room list
2. Empty state with friendly message
3. Error state with retry button
4. Loading spinner for join button
5. Toast notifications for errors

**Files to Modify**:
- `frontend/src/components/RoomList.tsx`
- `frontend/src/components/RoomListItem.tsx`
- `frontend/src/components/LoadingSpinner.tsx` (reuse)

**Acceptance Criteria**:
- [ ] Loading states smooth
- [ ] Empty state helpful
- [ ] Errors user-friendly
- [ ] Mobile responsive

---

### Task 2.11: Mobile Responsive Polish

**Estimated Time**: 2 hours

**Description**: Ensure perfect mobile experience

**Steps**:

1. Test on mobile devices/simulators
2. Adjust spacing and sizing
3. Use clamp() for responsive typography
4. Stack room cards on mobile
5. Touch-friendly buttons (44px min)
6. Test on iOS and Android browsers

**Files to Modify**:
- All room list components
- Mobile CSS

**Acceptance Criteria**:
- [ ] Works on 320px width screens
- [ ] Touch targets adequate
- [ ] No horizontal scroll
- [ ] Text readable on mobile

---

## Phase 3: Testing & Polish

### Task 3.1: Backend Unit Tests

**Estimated Time**: 3 hours

**Description**: Comprehensive unit tests for backend

**Test Coverage**:
- [ ] Repository methods (list, update visibility)
- [ ] Service methods (get rooms, update visibility)
- [ ] Handler methods (list endpoint, visibility endpoint)
- [ ] Rate limiting middleware
- [ ] Parameter validation
- [ ] Error cases

**Target**: 80%+ code coverage

**Files**:
- All `*_test.go` files in backend

---

### Task 3.2: Frontend Unit Tests

**Estimated Time**: 3 hours

**Description**: Unit tests for React components

**Test Coverage**:
- [ ] RoomList component
- [ ] RoomListItem component
- [ ] RoomVisibilityToggle component
- [ ] API service methods
- [ ] HomePage updates
- [ ] Loading/error states

**Target**: 80%+ code coverage

**Files**:
- All `*.test.tsx` files in frontend

---

### Task 3.3: Integration Tests

**Estimated Time**: 4 hours

**Description**: End-to-end API integration tests

**Test Scenarios**:
- [ ] Create public room → appears in list
- [ ] Create private room → not in list
- [ ] Join room from list → success
- [ ] Full room → join fails
- [ ] Update visibility → list updates
- [ ] Rate limiting → 429 response
- [ ] Pagination → correct rooms returned

**Files**:
- `backend/tests/integration/room_list_test.go` (new)

---

### Task 3.4: E2E Tests

**Estimated Time**: 3 hours

**Description**: Browser-based E2E tests

**Test Flows**:
- [ ] User sees room list on home page
- [ ] User creates public room
- [ ] Other user joins from list
- [ ] User creates private room
- [ ] Private room not visible in list
- [ ] User toggles visibility
- [ ] Mobile responsive behavior

**Tools**: Vitest + Testing Library or Playwright

---

### Task 3.5: Performance Testing

**Estimated Time**: 2 hours

**Description**: Load testing for room list

**Tests**:
- [ ] 1000 concurrent rooms in database
- [ ] API response time < 200ms (p95)
- [ ] Frontend renders 50 rooms in < 100ms
- [ ] Auto-refresh doesn't cause lag
- [ ] Database query optimization

**Tools**: k6 or Apache JMeter

---

### Task 3.6: Security Testing

**Estimated Time**: 2 hours

**Description**: Verify security measures

**Tests**:
- [ ] Rate limiting works
- [ ] Private rooms not exposed
- [ ] Unauthorized visibility update blocked
- [ ] SQL injection protection
- [ ] XSS protection in room data

---

### Task 3.7: Accessibility Testing

**Estimated Time**: 1.5 hours

**Description**: Ensure accessibility compliance

**Tests**:
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] ARIA labels present
- [ ] Color contrast sufficient
- [ ] Focus indicators visible

**Tools**: axe DevTools, Lighthouse

---

### Task 3.8: Cross-Browser Testing

**Estimated Time**: 1.5 hours

**Description**: Test on multiple browsers

**Browsers**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

### Task 3.9: UI Polish

**Estimated Time**: 2 hours

**Description**: Final UI improvements

**Improvements**:
- [ ] Smooth transitions
- [ ] Loading animations
- [ ] Hover states
- [ ] Focus states
- [ ] Empty state illustrations
- [ ] Error messages polished

---

### Task 3.10: Documentation Updates

**Estimated Time**: 2 hours

**Description**: Update all documentation

**Documents to Update**:
- [ ] API documentation (OpenAPI spec)
- [ ] README.md
- [ ] DOCKER.md
- [ ] User guide
- [ ] Architecture documentation

---

## Phase 4: Deployment

### Task 4.1: Database Migration

**Estimated Time**: 1 hour

**Description**: Run migration on production database

**Steps**:
1. Backup production database
2. Test migration on staging
3. Run migration on production
4. Verify indexes created
5. Monitor for issues

**Rollback Plan**: Reverse migration ready

---

### Task 4.2: Backend Deployment

**Estimated Time**: 1 hour

**Description**: Deploy backend changes

**Steps**:
1. Build Docker image (v0.3)
2. Tag and push to registry
3. Update Kubernetes deployment
4. Rolling update with zero downtime
5. Verify health checks pass
6. Monitor logs and metrics

---

### Task 4.3: Frontend Deployment

**Estimated Time**: 30 minutes

**Description**: Deploy frontend changes

**Steps**:
1. Included in Docker image (v0.3)
2. Frontend served by backend
3. Verify static assets load
4. Test room list on production
5. Clear CDN cache if applicable

---

### Task 4.4: Monitoring Setup

**Estimated Time**: 1.5 hours

**Description**: Set up monitoring and alerts

**Metrics to Track**:
- [ ] Room list API response time
- [ ] Room list endpoint error rate
- [ ] Number of public vs private rooms
- [ ] Join success rate from list
- [ ] Rate limit hits
- [ ] Database query performance

**Alerts**:
- [ ] API response time > 500ms
- [ ] Error rate > 1%
- [ ] Rate limit hits spike

---

### Task 4.5: Feature Flag (Optional)

**Estimated Time**: 1 hour

**Description**: Deploy behind feature flag

**Implementation**:
- Backend: Environment variable `ENABLE_ROOM_LIST`
- Frontend: Check feature flag before showing UI
- Allow gradual rollout
- Easy rollback if issues

**Priority**: P1 (Recommended)

---

### Task 4.6: Gradual Rollout

**Estimated Time**: Ongoing (1-2 days)

**Description**: Progressive rollout to users

**Plan**:
1. Day 1: 10% of users
2. Day 2: 50% of users
3. Day 3: 100% of users

**Monitor**: Errors, performance, user feedback

---

### Task 4.7: User Communication

**Estimated Time**: 1 hour

**Description**: Announce new feature

**Channels**:
- [ ] In-app notification/banner
- [ ] Email to active users (if applicable)
- [ ] Social media announcement
- [ ] Changelog update

---

## Summary

### Total Tasks: 42

### Time Breakdown

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Backend | 11 | 19 hours |
| Phase 2: Frontend | 11 | 20 hours |
| Phase 3: Testing | 10 | 24 hours |
| Phase 4: Deployment | 7 | 8 hours |
| **Total** | **42** | **71 hours** |

### Critical Path

The following tasks are on the critical path and must be completed in order:

1. Database schema changes (1.1)
2. Room model updates (1.2)
3. Repository methods (1.3, 1.4)
4. Service layer (1.5, 1.6, 1.7)
5. API endpoints (1.8, 1.9, 1.10)
6. Frontend types (2.1)
7. API services (2.2, 2.3)
8. UI components (2.4, 2.5, 2.6)
9. Page integration (2.7, 2.8)
10. Testing (Phase 3)
11. Deployment (Phase 4)

### Resource Requirements

- **1 Backend Developer**: Phase 1 (2-3 days)
- **1 Frontend Developer**: Phase 2 (3-4 days)
- **1 QA Engineer**: Phase 3 (2-3 days)
- **1 DevOps Engineer**: Phase 4 (1-2 days)

Or:

- **1 Full-Stack Developer**: All phases (8-12 days)

---

**Document Status**: Final
**Last Updated**: 2025-11-05
**Created By**: Claude
