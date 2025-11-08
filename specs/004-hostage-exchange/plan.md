# Implementation Plan: Hostage Exchange System

**Feature ID:** 004-hostage-exchange
**Priority:** High
**Estimated Duration:** 10 days
**Created:** 2025-11-08

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Backend Foundation](#phase-1-backend-foundation)
3. [Phase 2: Frontend Components](#phase-2-frontend-components)
4. [Phase 3: Integration & Testing](#phase-3-integration--testing)
5. [Phase 4: Deployment](#phase-4-deployment)
6. [Dependencies](#dependencies)
7. [Risk Assessment](#risk-assessment)

## Overview

### Goals

Implement the complete hostage exchange mechanic from Two Rooms and a Boom, including:
- 3 timed rounds (3min, 2min, 1min)
- Leader assignment and management
- Voluntary leadership transfer
- Democratic leader removal voting
- Hostage selection and exchange
- Real-time synchronization via WebSocket

### Success Criteria

- ✅ All 3 rounds complete successfully in test games
- ✅ 95%+ exchange success rate
- ✅ Timer accuracy within ±1 second
- ✅ 90%+ test coverage
- ✅ Zero critical bugs in staging

## Phase 1: Backend Foundation

**Duration:** 3 days (Days 1-3)
**Estimated Effort:** 24 hours

### Day 1: Core Round Management

#### 1.1 Create RoundState Model
**File:** `backend/internal/models/round_state.go`

**Tasks:**
- [ ] Define RoundState struct with all fields
- [ ] Add constants for round durations (180s, 120s, 60s)
- [ ] Add constants for round status (SETUP, ACTIVE, SELECTING, EXCHANGING, COMPLETE)
- [ ] Implement hostage count calculation by player count
- [ ] Add validation methods

**Implementation:**
```go
type RoundState struct {
    GameSessionID  string
    RoundNumber    int       // 1, 2, or 3
    Duration       int       // 180, 120, or 60 seconds
    TimeRemaining  int
    Status         string    // SETUP, ACTIVE, SELECTING, EXCHANGING, COMPLETE
    RedLeaderID    string
    BlueLeaderID   string
    HostageCount   int
    RedHostages    []string
    BlueHostages   []string
    StartedAt      time.Time
    EndedAt        *time.Time
}
```

**Testing:**
- [ ] Unit test: Hostage count calculation (6-10: 1, 11-21: 2/1/1, 22-30: 3/2/1)
- [ ] Unit test: Round duration by round number

---

#### 1.2 Implement Round Manager
**File:** `backend/internal/services/round_manager.go`

**Tasks:**
- [ ] Create RoundManager struct with Hub and Store
- [ ] Implement `StartRound()` - creates state, starts timer goroutine
- [ ] Implement `GetRoundState()` - retrieves current state
- [ ] Implement `EndRound()` - stops timer, transitions state
- [ ] Implement `TickTimer()` - decrements time, broadcasts TIMER_TICK
- [ ] Implement timer goroutine with 1-second interval
- [ ] Handle multiple concurrent game sessions
- [ ] Implement graceful shutdown for timers

**WebSocket Events:**
- [ ] ROUND_STARTED (roundNumber, duration, timeRemaining, leaders, hostageCount)
- [ ] TIMER_TICK (roundNumber, timeRemaining)
- [ ] ROUND_ENDED (roundNumber, finalRound, nextPhase)

**Testing:**
- [ ] Unit test: StartRound creates state correctly
- [ ] Unit test: Timer ticks every second
- [ ] Unit test: Timer expires triggers SELECTING phase
- [ ] Unit test: Multiple games run simultaneously
- [ ] Unit test: Timer cleanup on EndRound

**Estimated:** 4 hours

---

### Day 2: Leader Management & Voting

#### 2.1 Implement Leader Service
**File:** `backend/internal/services/leader_service.go`

**Tasks:**
- [ ] Create LeaderService struct
- [ ] Implement `AssignLeaders()` - random selection, one per room
- [ ] Implement `GetLeader()` - retrieve leader by room
- [ ] Implement `IsLeader()` - check if player is leader
- [ ] Implement `TransferLeadership()` - voluntary transfer
- [ ] Implement `HandleLeaderDisconnect()` - auto-reassign
- [ ] Implement `CanTransferLeadership()` - validation check
- [ ] Add validation: leaders are different players

**WebSocket Events:**
- [ ] LEADER_ASSIGNED (included in ROUND_STARTED)
- [ ] LEADER_TRANSFERRED (client → server)
- [ ] LEADERSHIP_CHANGED (oldLeader, newLeader, reason)

**Validation:**
- [ ] Current leader check
- [ ] Same room requirement
- [ ] Not during SELECTING phase
- [ ] New leader online check
- [ ] New leader not already a leader

**Testing:**
- [ ] Unit test: AssignLeaders selects one per room
- [ ] Unit test: Leaders are different players
- [ ] Unit test: IsLeader validates correctly
- [ ] Unit test: Transfer updates state correctly
- [ ] Unit test: Reject transfer during SELECTING
- [ ] Unit test: Reject transfer to wrong room
- [ ] Unit test: Reject transfer to offline player
- [ ] Unit test: Handle leader disconnect

**Estimated:** 4 hours

---

#### 2.2 Implement Voting Service
**File:** `backend/internal/services/voting_service.go`

**Tasks:**
- [ ] Create VoteSession model (`backend/internal/models/vote_session.go`)
- [ ] Create VotingService struct with session map
- [ ] Implement `StartVote()` - create session, start timeout goroutine
- [ ] Implement `CastVote()` - record vote, broadcast progress
- [ ] Implement `GetVoteSession()` - retrieve session
- [ ] Implement `CompleteVote()` - calculate result, trigger leader change
- [ ] Implement `HandleVoteTimeout()` - 30s timeout handling
- [ ] Implement `CanStartVote()` - validation checks
- [ ] Implement `GetActiveVoteForRoom()` - check for active votes
- [ ] Add vote privacy (individual votes not broadcast)

**WebSocket Events:**
- [ ] VOTE_REMOVE_LEADER_STARTED (client → server)
- [ ] VOTE_SESSION_STARTED (voteID, targetLeader, initiator, totalVoters, timeout)
- [ ] VOTE_CAST (client → server)
- [ ] VOTE_PROGRESS (votedCount, totalVoters, timeRemaining)
- [ ] VOTE_COMPLETED (result, yesVotes, noVotes, newLeader)

**Validation:**
- [ ] Initiator is in room
- [ ] Initiator is not leader
- [ ] ≥3 players in room
- [ ] No active vote in progress
- [ ] Not in SELECTING phase
- [ ] Vote ID valid and active
- [ ] Player hasn't already voted

**Testing:**
- [ ] Unit test: Start vote creates session
- [ ] Unit test: Reject vote during SELECTING
- [ ] Unit test: Reject vote with <3 players
- [ ] Unit test: Reject duplicate vote start
- [ ] Unit test: Reject vote by leader
- [ ] Unit test: Cast vote records correctly
- [ ] Unit test: Reject duplicate votes
- [ ] Unit test: Calculate majority (>50%)
- [ ] Unit test: Handle timeout
- [ ] Unit test: Trigger leader reassignment on PASSED
- [ ] Unit test: Broadcast events correctly
- [ ] Unit test: Clean up expired sessions

**Estimated:** 6 hours

---

### Day 3: Hostage Exchange

#### 3.1 Implement Exchange Service
**File:** `backend/internal/services/exchange_service.go`

**Tasks:**
- [ ] Create ExchangeHistory model (`backend/internal/models/exchange_history.go`)
- [ ] Create ExchangeService struct
- [ ] Implement `SelectHostages()` - receive leader selections
- [ ] Implement `ValidateSelections()` - validate both selections
- [ ] Implement `ExecuteExchange()` - atomic swap
- [ ] Implement atomic transaction for swaps
- [ ] Preserve player roles during exchange
- [ ] Log exchanges in history
- [ ] Handle errors gracefully

**WebSocket Events:**
- [ ] HOSTAGES_SELECTED (client → server)
- [ ] LEADER_ANNOUNCED_HOSTAGES (roomColor, hostages, waitingForOther)
- [ ] EXCHANGE_READY (redHostages, blueHostages, countdown)
- [ ] EXCHANGE_COMPLETE (exchanges, nextRound)

**Validation:**
- [ ] Sender is leader
- [ ] Correct hostage count
- [ ] No self-selection
- [ ] Valid player IDs
- [ ] Players in leader's room
- [ ] No duplicates
- [ ] Equal counts for both rooms

**Testing:**
- [ ] Unit test: Validate hostage count
- [ ] Unit test: Reject self-selection
- [ ] Unit test: Reject invalid player IDs
- [ ] Unit test: Reject players from wrong room
- [ ] Unit test: Execute exchange swaps correctly
- [ ] Unit test: Preserve roles during exchange
- [ ] Unit test: Log exchanges
- [ ] Unit test: Atomic transaction rollback on error

**Estimated:** 4 hours

---

#### 3.2 REST API Endpoints
**File:** `backend/internal/handlers/round_handler.go`

**Tasks:**
- [ ] POST `/api/v1/rooms/:code/rounds/start` - Start round (host only)
- [ ] GET `/api/v1/rooms/:code/rounds/current` - Get round state
- [ ] POST `/api/v1/rooms/:code/rounds/:num/end` - Force end round (host only)
- [ ] Add authorization middleware (HostOnly)
- [ ] Add request validation
- [ ] Add error handling

**Testing:**
- [ ] Integration test: Start round endpoint
- [ ] Integration test: Get round state
- [ ] Integration test: Force end round
- [ ] Integration test: Host-only authorization
- [ ] Integration test: Invalid requests return 400

**Estimated:** 2 hours

---

#### 3.3 Update GameSession Model
**File:** `backend/internal/models/game_session.go`

**Tasks:**
- [ ] Add `CurrentRound int` field
- [ ] Add `RoundState *RoundState` field
- [ ] Add `ExchangeHistory *ExchangeHistory` field
- [ ] Update JSON serialization

**Estimated:** 1 hour

---

### Day 1-3 Summary

**Total Backend Deliverables:**
- ✅ 3 new models (RoundState, VoteSession, ExchangeHistory)
- ✅ 4 new services (RoundManager, LeaderService, VotingService, ExchangeService)
- ✅ 3 REST endpoints
- ✅ 14 WebSocket events
- ✅ ~60 unit tests
- ✅ ~5 integration tests

---

## Phase 2: Frontend Components

**Duration:** 3 days (Days 4-6)
**Estimated Effort:** 24 hours

### Day 4: Core UI Components

#### 4.1 RoundTimer Component
**File:** `frontend/src/components/game/RoundTimer.tsx`

**Tasks:**
- [ ] Create component with props (round, timeRemaining, totalTime)
- [ ] Implement MM:SS format display
- [ ] Add circular progress bar
- [ ] Implement color changes (green → yellow → red)
- [ ] Add pulse animation when <30s
- [ ] Subscribe to TIMER_TICK events
- [ ] Handle round transitions

**Styling:**
- [ ] Responsive design (desktop + mobile)
- [ ] Sticky positioning at top
- [ ] Accessibility (ARIA live region)

**Testing:**
- [ ] Unit test: Displays time in MM:SS
- [ ] Unit test: Updates every second
- [ ] Unit test: Color changes based on time
- [ ] Unit test: Pulse animation when critical
- [ ] Visual test: Snapshot testing

**Estimated:** 3 hours

---

#### 4.2 LeaderPanel Component
**File:** `frontend/src/components/game/LeaderPanel.tsx`

**Tasks:**
- [ ] Create component with props (isLeader, hostageCount, players, etc.)
- [ ] Add "Transfer Leadership" button
- [ ] Implement player selection checkboxes
- [ ] Add vote counter ("N / N selected")
- [ ] Add "Announce Hostages" button
- [ ] Disable self-selection
- [ ] Disable during SELECTING phase
- [ ] Add validation error messages
- [ ] Handle HOSTAGES_SELECTED event

**Styling:**
- [ ] Mobile-friendly touch targets (≥44px)
- [ ] Clear visual hierarchy
- [ ] Disabled state styling

**Testing:**
- [ ] Unit test: Only visible to leaders
- [ ] Unit test: Can select/deselect players
- [ ] Unit test: Cannot select self
- [ ] Unit test: Announce button disabled until correct count
- [ ] Unit test: Shows validation errors

**Estimated:** 4 hours

---

### Day 5: Advanced UI Components

#### 5.1 LeaderTransferModal Component
**File:** `frontend/src/components/game/LeaderTransferModal.tsx`

**Tasks:**
- [ ] Create modal component with props
- [ ] Add radio button selection for room members
- [ ] Exclude current leader from list
- [ ] Show player online/offline status
- [ ] Add confirmation step
- [ ] Handle ESC key to cancel
- [ ] Emit LEADER_TRANSFERRED event
- [ ] Disable during SELECTING phase
- [ ] Show blocking reason if disabled

**Styling:**
- [ ] Modal backdrop
- [ ] Centered dialog
- [ ] Responsive design

**Testing:**
- [ ] Unit test: Shows room members excluding self
- [ ] Unit test: Cannot select offline players
- [ ] Unit test: Shows confirmation dialog
- [ ] Unit test: Emits event on confirm
- [ ] Unit test: Closes on cancel
- [ ] Unit test: Disabled during SELECTING

**Estimated:** 3 hours

---

#### 5.2 VoteDialog Component
**File:** `frontend/src/components/game/VoteDialog.tsx`

**Tasks:**
- [ ] Create modal component with props
- [ ] Display target leader name and initiator
- [ ] Add YES/NO buttons
- [ ] Show vote counter ("X / Y voted")
- [ ] Add 30-second countdown timer
- [ ] Show "Waiting for others..." after voting
- [ ] Display vote result (PASSED/FAILED/TIMEOUT)
- [ ] Auto-close 3 seconds after result
- [ ] Cannot be dismissed during active vote
- [ ] Handle VOTE_SESSION_STARTED event
- [ ] Handle VOTE_PROGRESS event
- [ ] Handle VOTE_COMPLETED event

**Styling:**
- [ ] Progress bar for timeout
- [ ] Green/red color coding
- [ ] Cannot dismiss during vote

**Testing:**
- [ ] Unit test: Displays session info correctly
- [ ] Unit test: Shows countdown timer
- [ ] Unit test: Enables buttons when active
- [ ] Unit test: Disables after voting
- [ ] Unit test: Shows waiting state
- [ ] Unit test: Displays progress counter
- [ ] Unit test: Shows result correctly
- [ ] Unit test: Auto-closes after result
- [ ] Unit test: Cannot manually dismiss

**Estimated:** 4 hours

---

### Day 6: Supporting Components & Integration

#### 6.1 ExchangeAnimation Component
**File:** `frontend/src/components/game/ExchangeAnimation.tsx`

**Tasks:**
- [ ] Create animation component
- [ ] Implement player card movement between rooms
- [ ] Add 2-second animation duration
- [ ] Show "↔️ Exchange in Progress" overlay
- [ ] Add confetti/particle effects
- [ ] Handle EXCHANGE_READY event
- [ ] Handle EXCHANGE_COMPLETE event
- [ ] Trigger room list updates after animation

**Testing:**
- [ ] Unit test: Animates player movement
- [ ] Unit test: Updates room lists after animation
- [ ] Unit test: Shows correct notifications

**Estimated:** 3 hours

---

#### 6.2 RoundHistory Component
**File:** `frontend/src/components/game/RoundHistory.tsx`

**Tasks:**
- [ ] Create collapsible timeline component
- [ ] Display exchanges per round
- [ ] Show leadership transfers
- [ ] Show vote results
- [ ] Add timestamps
- [ ] Make mobile-responsive (bottom sheet)

**Testing:**
- [ ] Unit test: Displays exchange history
- [ ] Unit test: Shows leadership changes
- [ ] Unit test: Collapsible behavior

**Estimated:** 2 hours

---

#### 6.3 Update RoomPage Integration
**File:** `frontend/src/pages/RoomPage.tsx`

**Tasks:**
- [ ] Add state management for round, leaders, votes
- [ ] Integrate RoundTimer component
- [ ] Integrate LeaderPanel for leaders
- [ ] Integrate LeaderTransferModal
- [ ] Integrate VoteDialog
- [ ] Integrate ExchangeAnimation
- [ ] Integrate RoundHistory
- [ ] Add WebSocket event handlers for all new events
- [ ] Handle round transitions (ACTIVE → SELECTING → EXCHANGING)
- [ ] Handle leadership changes
- [ ] Handle vote lifecycle
- [ ] Update room player lists after exchanges

**WebSocket Event Handlers:**
- [ ] ROUND_STARTED
- [ ] TIMER_TICK
- [ ] LEADERSHIP_CHANGED
- [ ] VOTE_SESSION_STARTED
- [ ] VOTE_PROGRESS
- [ ] VOTE_COMPLETED
- [ ] HOSTAGES_SELECTED
- [ ] LEADER_ANNOUNCED_HOSTAGES
- [ ] EXCHANGE_READY
- [ ] EXCHANGE_COMPLETE
- [ ] ROUND_ENDED

**Testing:**
- [ ] Integration test: Round flow works end-to-end
- [ ] Integration test: Leadership transfer works
- [ ] Integration test: Voting works
- [ ] Integration test: Exchange works

**Estimated:** 5 hours

---

#### 6.4 TypeScript Types
**File:** `frontend/src/types/game.types.ts`

**Tasks:**
- [ ] Add RoundState interface
- [ ] Add ExchangeRecord interface
- [ ] Add LeaderInfo interface
- [ ] Add VoteSession interface
- [ ] Add VoteChoice type
- [ ] Add VoteResult interface
- [ ] Update existing types as needed

**Estimated:** 1 hour

---

### Day 4-6 Summary

**Total Frontend Deliverables:**
- ✅ 6 new components (RoundTimer, LeaderPanel, LeaderTransferModal, VoteDialog, ExchangeAnimation, RoundHistory)
- ✅ Updated RoomPage with full integration
- ✅ 11 WebSocket event handlers
- ✅ 6 new TypeScript interfaces
- ✅ ~30 component tests
- ✅ Mobile-responsive design

---

## Phase 3: Integration & Testing

**Duration:** 3 days (Days 7-9)
**Estimated Effort:** 24 hours

### Day 7: End-to-End Testing

#### 7.1 E2E Test Suite
**File:** `e2e/hostage-exchange.spec.ts`

**Tasks:**
- [ ] Test: Complete round with hostage exchange
- [ ] Test: Leadership transfer mid-round
- [ ] Test: Vote to remove leader (passed)
- [ ] Test: Vote to remove leader (failed)
- [ ] Test: Vote timeout
- [ ] Test: Multiple rounds with exchanges
- [ ] Test: Game completion after Round 3

**Playwright Tests:**
```typescript
test('complete round with hostage exchange', async ({ page }) => {
  // Create game, start, verify round progression
  // Leaders select hostages, verify exchange
  // Check player room assignments updated
});

test('vote to remove leader', async ({ page, context }) => {
  // Start vote, all players vote YES
  // Verify new leader assigned
  // Verify old leader no longer has controls
});

test('leadership transfer', async ({ page }) => {
  // Leader clicks transfer
  // Selects new leader, confirms
  // Verify crown badge moves
  // Verify controls transfer
});
```

**Estimated:** 6 hours

---

### Day 8: Performance & Bug Fixes

#### 8.1 Performance Testing

**Tasks:**
- [ ] Test: Timer accuracy over 100 rounds (<100ms jitter)
- [ ] Test: Exchange latency (<2s from selection to UI update)
- [ ] Test: Concurrent load (100 concurrent games)
- [ ] Test: Memory leaks (1000 rounds, stable memory)
- [ ] Test: WebSocket latency (<100ms)
- [ ] Profile and optimize slow operations

**Tools:**
- [ ] Use `k6` for load testing
- [ ] Use Chrome DevTools for memory profiling
- [ ] Use Go pprof for backend profiling

**Estimated:** 4 hours

---

#### 8.2 Bug Fixes & Polish

**Tasks:**
- [ ] Fix any bugs found during E2E testing
- [ ] UI polish (animations, transitions)
- [ ] Accessibility improvements (keyboard navigation, ARIA)
- [ ] Error message improvements
- [ ] Loading states
- [ ] Empty states

**Estimated:** 4 hours

---

### Day 9: Documentation & Code Review

#### 9.1 Documentation

**Tasks:**
- [ ] Update API documentation with new endpoints
- [ ] Document WebSocket event contracts
- [ ] Add JSDoc comments to components
- [ ] Add GoDoc comments to services
- [ ] Update README with new feature
- [ ] Create user guide for hostage exchange
- [ ] Document troubleshooting steps

**Estimated:** 3 hours

---

#### 9.2 Code Review & Refinement

**Tasks:**
- [ ] Self-review all code
- [ ] Ensure consistent code style
- [ ] Remove debug logging
- [ ] Check error handling coverage
- [ ] Verify test coverage ≥90%
- [ ] Run linters (eslint, golangci-lint)
- [ ] Fix any linter warnings

**Tools:**
```bash
# Frontend
npm run lint
npm run test -- --coverage

# Backend
golangci-lint run
go test -cover ./...
```

**Estimated:** 3 hours

---

### Day 7-9 Summary

**Total Testing & QA Deliverables:**
- ✅ 7+ E2E tests
- ✅ Performance benchmarks
- ✅ 90%+ test coverage
- ✅ Complete documentation
- ✅ Zero critical bugs
- ✅ Production-ready code

---

## Phase 4: Deployment

**Duration:** 1 day (Day 10)
**Estimated Effort:** 8 hours

### Day 10: Staging & Production Deployment

#### 10.1 Staging Deployment

**Tasks:**
- [ ] Deploy backend to staging
- [ ] Deploy frontend to staging
- [ ] Verify health checks pass
- [ ] Run smoke tests
- [ ] Test with real users (beta testers)
- [ ] Monitor error rates
- [ ] Collect initial feedback

**Smoke Tests:**
- [ ] Can create game
- [ ] Can start round
- [ ] Timer counts down correctly
- [ ] Leaders can select hostages
- [ ] Exchange completes successfully
- [ ] Leadership transfer works
- [ ] Voting works

**Estimated:** 3 hours

---

#### 10.2 Production Deployment

**Tasks:**
- [ ] Create deployment checklist
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Verify health checks pass
- [ ] Enable feature flag (gradual rollout)
- [ ] Monitor metrics (error rate, latency, exchange success rate)
- [ ] Set up alerts

**Metrics to Monitor:**
- Exchange success rate (target: >95%)
- Timer drift (target: <2s)
- WebSocket disconnections during exchange (target: <1%)
- Vote completion rate (target: >90%)
- Average round duration

**Rollout Strategy:**
- Day 1: 10% of games
- Day 2: 25% of games
- Day 3: 50% of games
- Day 4: 100% of games

**Estimated:** 3 hours

---

#### 10.3 Post-Deployment Monitoring

**Tasks:**
- [ ] Monitor error logs
- [ ] Check WebSocket connection stability
- [ ] Verify timer accuracy in production
- [ ] Track exchange success rate
- [ ] Monitor vote completion rate
- [ ] Respond to user feedback
- [ ] Hotfix critical issues if needed

**Estimated:** 2 hours

---

### Day 10 Summary

**Total Deployment Deliverables:**
- ✅ Staging deployment complete
- ✅ Production deployment complete
- ✅ Monitoring dashboards configured
- ✅ Gradual rollout in progress
- ✅ Zero critical issues in production

---

## Dependencies

### External Dependencies

1. **WebSocket Library**
   - Current: `gorilla/websocket` (backend), native WebSocket API (frontend)
   - No changes needed

2. **UI Components**
   - React 18+
   - TypeScript
   - CSS Modules or Styled Components

3. **Testing Libraries**
   - Playwright (E2E)
   - Jest + React Testing Library (Frontend)
   - Go testing package (Backend)

### Internal Dependencies

1. **Existing Models**
   - `GameSession` (needs update)
   - `Player` (no changes)
   - `Room` (no changes)

2. **Existing Services**
   - `GameService` (integrate with RoundManager)
   - `WebSocket Hub` (add new event types)

3. **Existing Components**
   - `RoomPage` (major integration point)
   - `PlayerList` (minor updates for leader badges)

---

## Risk Assessment

### High Risk

#### 1. Timer Synchronization Across Clients
**Risk:** Timer drift causes inconsistent state
**Mitigation:**
- Server is source of truth for time
- Broadcast TIMER_TICK every second
- Clients reconcile with server time
- Test with high network latency

#### 2. Race Conditions During Exchange
**Risk:** Player states become inconsistent
**Mitigation:**
- Use atomic transactions for swaps
- Lock critical sections with mutex
- Comprehensive integration tests
- Rollback on any error

#### 3. Vote Session Memory Leaks
**Risk:** Expired vote sessions not cleaned up
**Mitigation:**
- Implement cleanup goroutine
- Set max session lifetime
- Monitor memory usage
- Unit tests for cleanup logic

---

### Medium Risk

#### 4. Leader Disconnection During Exchange
**Risk:** Exchange stuck waiting for disconnected leader
**Mitigation:**
- Auto-reassign leader on disconnect
- Timeout mechanism for selections
- Host can force end round
- Integration tests for disconnection

#### 5. WebSocket Connection Drops During Vote
**Risk:** Players miss vote session
**Mitigation:**
- Implement reconnection logic
- Resume vote session on reconnect
- Show vote status on reconnect
- Test with network interruptions

#### 6. Complex State Management in Frontend
**Risk:** UI state out of sync with server
**Mitigation:**
- Single source of truth (server)
- Event-driven updates
- Optimistic UI updates with rollback
- Comprehensive E2E tests

---

### Low Risk

#### 7. Mobile Performance
**Risk:** Animations lag on mobile devices
**Mitigation:**
- Simplified animations for mobile
- Use CSS transforms (GPU-accelerated)
- Test on real devices
- Progressive enhancement

#### 8. Accessibility Issues
**Risk:** Screen readers can't use features
**Mitigation:**
- ARIA labels and live regions
- Keyboard navigation support
- High contrast mode
- Accessibility audit

---

## Rollback Plan

### Triggers

Rollback if any of:
- Exchange failure rate >5%
- Timer drift >2 seconds
- Critical bugs affecting gameplay
- Vote completion rate <70%

### Rollback Steps

1. **Disable Feature Flag**
   - Revert to continuous gameplay mode
   - No rounds, no exchanges

2. **Database Rollback** (if needed)
   - Restore GameSession schema
   - Migrate active games

3. **Monitor & Fix**
   - Investigate root cause
   - Fix issues in development
   - Re-test thoroughly

4. **Re-Deploy**
   - Deploy fixes to staging
   - Smoke test
   - Gradual rollout again

---

## Success Metrics (Post-Launch)

### Week 1

- ✅ 95%+ exchange success rate
- ✅ <2% timer drift
- ✅ <1% WebSocket disconnections during exchanges
- ✅ Average round completion time within expected range
- ✅ Zero data corruption incidents

### Month 1

- ✅ 80%+ of players complete all 3 rounds
- ✅ 90%+ player satisfaction (surveys)
- ✅ Feature adoption rate >70%
- ✅ <1% of games require manual intervention

---

## Post-Implementation Tasks

### Future Enhancements (v2)

1. **Custom Round Configuration**
   - Host can set round durations
   - Variable round counts (2-5 rounds)
   - Custom hostage counts

2. **Hostage Negotiation Phase**
   - 30-second leader-to-leader chat
   - Private messaging
   - Negotiation tracking

3. **Leader Abilities**
   - Veto hostage selections
   - Force reveal
   - Special powers

4. **Analytics & Replay**
   - Download exchange history as JSON
   - Visual timeline
   - Replay feature
   - Win rate by strategy

5. **Pause/Resume**
   - Host can pause timer
   - Consensus pause (majority vote)
   - Auto-resume after timeout

---

## Appendix

### File Structure

```
backend/
├── internal/
│   ├── models/
│   │   ├── round_state.go          # NEW
│   │   ├── vote_session.go         # NEW
│   │   ├── exchange_history.go     # NEW
│   │   └── game_session.go         # UPDATED
│   ├── services/
│   │   ├── round_manager.go        # NEW
│   │   ├── leader_service.go       # NEW
│   │   ├── voting_service.go       # NEW
│   │   └── exchange_service.go     # NEW
│   └── handlers/
│       └── round_handler.go        # NEW
└── tests/
    ├── round_manager_test.go       # NEW
    ├── leader_service_test.go      # NEW
    ├── voting_service_test.go      # NEW
    └── exchange_service_test.go    # NEW

frontend/
├── src/
│   ├── components/
│   │   └── game/
│   │       ├── RoundTimer.tsx              # NEW
│   │       ├── LeaderPanel.tsx             # NEW
│   │       ├── LeaderTransferModal.tsx     # NEW
│   │       ├── VoteDialog.tsx              # NEW
│   │       ├── ExchangeAnimation.tsx       # NEW
│   │       └── RoundHistory.tsx            # NEW
│   ├── pages/
│   │   └── RoomPage.tsx                    # UPDATED
│   └── types/
│       └── game.types.ts                   # UPDATED
└── tests/
    └── components/
        └── game/
            ├── RoundTimer.test.tsx         # NEW
            ├── LeaderPanel.test.tsx        # NEW
            ├── LeaderTransferModal.test.tsx # NEW
            ├── VoteDialog.test.tsx         # NEW
            └── ExchangeAnimation.test.tsx  # NEW

e2e/
└── hostage-exchange.spec.ts                # NEW
```

### Key Commands

```bash
# Backend
cd backend
go test ./...
go run cmd/server/main.go

# Frontend
cd frontend
npm test
npm run lint
npm run dev

# E2E
npx playwright test
npx playwright test --ui

# Docker
docker build -t 2r1b:latest .
docker-compose up -d
```

---

**Plan Version:** 1.0
**Created By:** Claude (AI Assistant)
**Last Updated:** 2025-11-08
