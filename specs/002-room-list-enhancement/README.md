# Feature 002: Room List and Join Enhancement

## Quick Links

- **[Feature Specification](./spec.md)** - Complete feature requirements and design
- **[Implementation Plan](./plan.md)** - Step-by-step implementation guide with 42 tasks
- **[Testing Plan](./testing.md)** - Comprehensive testing strategy

## Overview

This feature adds a public room list to the home page, allowing users to browse and join available games without needing a room code.

## Key Features

- 🔍 **Room Discovery**: Browse list of public rooms
- ⚡ **Quick Join**: One-click join from list
- 🔒 **Privacy Control**: Toggle room visibility (public/private)
- 🔄 **Auto-Refresh**: Real-time room list updates
- 📱 **Mobile Responsive**: Optimized for mobile devices

## Documents

### 1. Feature Specification (`spec.md`)

**Contains**:
- Problem statement and goals
- User stories with acceptance criteria
- Functional and non-functional requirements
- UI wireframes and design guidelines
- Technical design (data models, API endpoints)
- Security considerations
- Success metrics

**Read this first** to understand what we're building and why.

### 2. Implementation Plan (`plan.md`)

**Contains**:
- 4 implementation phases
- 42 detailed tasks with estimates
- Step-by-step instructions
- Files to create/modify
- Acceptance criteria for each task
- Time estimates (8-12 days total)

**Use this** as your implementation guide.

### 3. Testing Plan (`testing.md`)

**Contains**:
- Unit testing strategy (80%+ coverage)
- Integration test scenarios
- E2E test flows
- Performance test benchmarks
- Security test cases
- Accessibility requirements
- Cross-browser testing checklist

**Follow this** to ensure quality.

## Implementation Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 1** | 2-3 days | Backend API and database changes |
| **Phase 2** | 3-4 days | Frontend components and UI |
| **Phase 3** | 2-3 days | Testing and quality assurance |
| **Phase 4** | 1-2 days | Deployment and monitoring |

**Total**: 8-12 days for 1 full-stack developer

## Getting Started

### Prerequisites

- Feature 001 (Multiplayer Game Host) must be completed
- Database must support migrations
- Backend must support rate limiting
- Frontend must support React 18+

### Step 1: Review Documents

1. Read [spec.md](./spec.md) to understand requirements
2. Review [plan.md](./plan.md) for implementation approach
3. Check [testing.md](./testing.md) for quality standards

### Step 2: Set Up Development Environment

```bash
# Backend
cd backend
go test ./... # Ensure tests pass

# Frontend
cd frontend
npm test # Ensure tests pass
```

### Step 3: Start with Phase 1

Follow the tasks in [plan.md](./plan.md) starting with Phase 1, Task 1.1.

## Architecture Overview

### Backend Changes

```
backend/
├── migrations/
│   └── 003_add_room_visibility.sql    (NEW)
├── internal/
│   ├── models/
│   │   └── room.go                    (MODIFIED - add IsPublic, timestamps)
│   ├── repository/
│   │   └── room_repository.go         (NEW METHODS - ListPublicRooms)
│   ├── services/
│   │   └── room_service.go            (NEW METHODS - GetPublicRooms)
│   ├── handlers/
│   │   └── room_handler.go            (NEW ENDPOINTS - GET /api/v1/rooms)
│   └── middleware/
│       └── rate_limiter.go            (NEW)
```

### Frontend Changes

```
frontend/
├── src/
│   ├── types/
│   │   └── game.types.ts              (MODIFIED - add RoomListItem)
│   ├── services/
│   │   └── api.ts                     (NEW METHODS - listRooms)
│   ├── components/
│   │   ├── RoomList.tsx               (NEW)
│   │   ├── RoomListItem.tsx           (NEW)
│   │   └── RoomVisibilityToggle.tsx   (NEW)
│   └── pages/
│       └── HomePage.tsx               (MODIFIED - add room list)
```

## API Endpoints

### New Endpoints

```
GET    /api/v1/rooms                      - List public rooms
PATCH  /api/v1/rooms/:code/visibility     - Update room visibility
```

### Modified Endpoints

```
POST   /api/v1/rooms                      - Add isPublic parameter
```

## Database Changes

```sql
-- Add to rooms table
ALTER TABLE rooms ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE rooms ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rooms ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add indexes
CREATE INDEX idx_rooms_public_status ON rooms(is_public, status);
CREATE INDEX idx_rooms_created_at ON rooms(created_at DESC);
```

## Success Metrics

### Target Metrics

- 70% of joins via room list (vs manual code entry)
- 95% join success rate from list
- < 30 seconds average from home page to joined room
- p95 API response time < 200ms

### Monitoring

- Track room list API usage
- Monitor join success rates
- Measure time-to-join metrics
- Track public vs private room ratio

## Testing Requirements

### Minimum Test Coverage

- Backend: 80%+ code coverage
- Frontend: 80%+ code coverage
- All API endpoints: Integration tested
- Critical flows: E2E tested
- Performance: Benchmarked
- Security: Vulnerability scanned

### Test Commands

```bash
# Backend tests
cd backend
go test ./... -v -cover

# Frontend tests
cd frontend
npm test -- --coverage

# E2E tests
npm run test:e2e

# Performance tests
k6 run tests/performance/room-list-load.js
```

## Rollout Plan

### Phase 1: Staging (Days 1-2)

- Deploy to staging environment
- Internal testing
- Fix critical bugs

### Phase 2: Canary (Days 3-4)

- Deploy to 10% of users
- Monitor metrics
- Gather feedback

### Phase 3: Full Rollout (Day 5+)

- Deploy to all users
- Monitor closely
- Iterate based on feedback

## Known Risks

1. **Performance**: Large number of rooms could slow API
   - *Mitigation*: Pagination, caching, indexing

2. **Spam**: Users creating fake rooms
   - *Mitigation*: Rate limiting, auto-cleanup

3. **Privacy**: Users accidentally creating public rooms
   - *Mitigation*: Clear UI, confirmation dialogs

## Future Enhancements

- Room search by name
- Advanced filtering
- Room favorites
- Spectator mode
- Quick join (auto-join best room)

## Support

### Questions?

- Check [spec.md](./spec.md) for requirements clarification
- Check [plan.md](./plan.md) for implementation details
- Check [testing.md](./testing.md) for testing guidance

### Issues?

- Create GitHub issue with label `feature-002`
- Include relevant document section
- Provide context and expected behavior

---

**Feature Status**: Planning
**Last Updated**: 2025-11-05
**Owner**: TBD
