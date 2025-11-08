# Feature 004: Hostage Exchange System

## Overview

Implement the core hostage exchange mechanic from Two Rooms and a Boom, allowing room leaders to strategically trade players between rooms at the end of each timed round.

**Feature ID:** 004-hostage-exchange
**Priority:** High
**Status:** Planning
**Created:** 2025-11-08
**Last Updated:** 2025-11-08

## Table of Contents

1. [Background](#background)
2. [Goals & Success Metrics](#goals--success-metrics)
3. [Requirements](#requirements)
4. [User Stories](#user-stories)
5. [Game Flow](#game-flow)
6. [Technical Design](#technical-design)
7. [UI/UX Design](#uiux-design)
8. [API Specifications](#api-specifications)
9. [Data Models](#data-models)
10. [Security & Validation](#security--validation)
11. [Testing Strategy](#testing-strategy)
12. [Deployment Plan](#deployment-plan)

## Background

### What is Hostage Exchange?

The hostage exchange is the core mechanic of Two Rooms and a Boom that creates strategic gameplay:

- **Players are separated** into two rooms (Red Room and Blue Room)
- **Each round is timed** (Round 1: 3 minutes, Round 2: 2 minutes, Round 3: 1 minute)
- **Leaders select hostages** to send to the other room
- **Equal number of players** are exchanged between rooms
- **Strategic positioning** allows teams to isolate or expose key roles

### Official Game Rules

From the official Two Rooms and a Boom rulebook:

1. **Leader Selection:** Each room has a leader who controls hostage selection
2. **Equal Exchange:** Same number of hostages traded from each room
3. **Leader Immunity:** Leaders themselves cannot be selected as hostages
4. **Public Announcement:** Leaders announce hostages to their room only
5. **Leader Parley:** Leaders meet between rooms before exchange
6. **Irrevocable Selection:** Once announced, hostage selection cannot be changed

### Number of Hostages by Player Count

| Player Count | Round 1 | Round 2 | Round 3 |
|-------------|---------|---------|---------|
| 6-10        | 1       | 1       | 1       |
| 11-21       | 2       | 1       | 1       |
| 22-30       | 3       | 2       | 1       |

### Why This Feature is Important

Currently, the game implementation:
- ❌ Has no round structure (continuous gameplay)
- ❌ Has no timed rounds
- ❌ Has no leader selection mechanism
- ❌ Has no hostage exchange system
- ❌ Players cannot strategically move between rooms

This feature will:
- ✅ Add authentic Two Rooms and a Boom gameplay
- ✅ Create strategic depth and social deduction
- ✅ Enable team coordination and role protection
- ✅ Add time pressure and decision-making
- ✅ Provide clear game structure (3 rounds → reveal)

## Goals & Success Metrics

### Primary Goals

1. **Implement Timed Rounds**
   - 3-round structure with decreasing time (3min → 2min → 1min)
   - Automatic progression between rounds
   - Timer visible to all players

2. **Enable Leader Selection**
   - Democratic voting or random leader assignment
   - Leader cards/badges visible to room members
   - Leader-specific UI controls
   - Voluntary leadership transfer during rounds
   - Automatic reassignment on leader disconnect

3. **Create Hostage Selection Interface**
   - Leaders can select appropriate number of hostages
   - Visual feedback for selected hostages
   - Prevent leader from selecting themselves

4. **Implement Hostage Exchange**
   - Synchronized exchange between rooms
   - Equal number validation
   - Player movement between rooms
   - Visual feedback during exchange

5. **Maintain Game State**
   - Track current round (1, 2, 3)
   - Track round timer
   - Track leader assignments
   - Track hostage selections
   - Preserve role assignments across moves

### Success Metrics

#### Functional Metrics
- ✅ 100% of games complete all 3 rounds successfully
- ✅ 95%+ of hostage exchanges execute without errors
- ✅ Leaders selected within 10 seconds of round start
- ✅ Hostage selection UI response time < 200ms
- ✅ Timer accuracy within ±1 second

#### User Experience Metrics
- ✅ 80%+ of leaders successfully select hostages on first try
- ✅ 90%+ of players understand round structure after one game
- ✅ Average hostage selection time < 30 seconds
- ✅ Zero player confusion about current room assignment

#### Technical Metrics
- ✅ WebSocket latency < 100ms for exchange events
- ✅ 99.9% uptime during exchanges
- ✅ Support for 30 concurrent games with exchanges
- ✅ Database query time < 50ms for state updates

## Requirements

### Functional Requirements

#### FR-001: Round Management
- **FR-001.1:** Game MUST have 3 timed rounds with durations: 3min, 2min, 1min
- **FR-001.2:** Round timer MUST be visible to all players
- **FR-001.3:** Round timer MUST be synchronized across all clients
- **FR-001.4:** Round MUST auto-advance when timer expires
- **FR-001.5:** Players MUST be notified of round changes

#### FR-002: Leader Selection
- **FR-002.1:** Each room MUST have exactly one leader at any given time
- **FR-002.2:** Leaders MUST be selected before hostage selection phase
- **FR-002.3:** Leader selection methods:
  - **Option A:** Random assignment (initial implementation)
  - **Option B:** Democratic voting (initial leader selection)
- **FR-002.4:** Leader MUST be visually distinguished in room player list
- **FR-002.5:** Leader cards MUST display leader's special privileges
- **FR-002.6:** Leaders CAN voluntarily transfer leadership to another player in their room
- **FR-002.7:** Leadership transfers MUST be validated by the server
- **FR-002.8:** New leader MUST be in the same room as current leader
- **FR-002.9:** Leadership transfers MUST be disabled during hostage selection phase
- **FR-002.10:** All room members MUST be notified of leadership changes
- **FR-002.11:** Room members CAN initiate a vote to remove current leader
- **FR-002.12:** Vote to remove leader requires majority (>50%) of room members
- **FR-002.13:** Each player can only vote once per vote session
- **FR-002.14:** Vote sessions timeout after 30 seconds
- **FR-002.15:** Successful vote triggers random assignment of new leader
- **FR-002.16:** Leader removal votes MUST be disabled during hostage selection phase
- **FR-002.17:** Minimum 3 players required in room to initiate leader removal vote
- **FR-002.18:** Vote initiator MUST be in the same room as the leader being voted on

#### FR-003: Hostage Selection
- **FR-003.1:** Only room leader CAN select hostages
- **FR-003.2:** Leader MUST select exactly N hostages (based on round/player count)
- **FR-003.3:** Leader CANNOT select themselves as hostage
- **FR-003.4:** Leader CANNOT change selection after announcement
- **FR-003.5:** Hostage selection MUST be visible to room members only
- **FR-003.6:** System MUST validate hostage count before exchange

#### FR-004: Hostage Exchange
- **FR-004.1:** Both leaders MUST complete selection before exchange
- **FR-004.2:** Exchange MUST move equal number of players between rooms
- **FR-004.3:** Player roles MUST be preserved during exchange
- **FR-004.4:** Room assignments MUST update immediately after exchange
- **FR-004.5:** All players MUST be notified of exchange completion
- **FR-004.6:** Exchange triggers start of next round (or game end)

#### FR-005: Game State Management
- **FR-005.1:** System MUST track current round number (1, 2, 3)
- **FR-005.2:** System MUST track time remaining in current round
- **FR-005.3:** System MUST track leader assignments per room
- **FR-005.4:** System MUST track hostage selections per room
- **FR-005.5:** System MUST track player room assignments
- **FR-005.6:** Game state MUST persist across server restarts

### Non-Functional Requirements

#### NFR-001: Performance
- Timer updates MUST occur every second with <100ms jitter
- Hostage exchange MUST complete within 2 seconds
- UI MUST be responsive (60fps) during timer countdown
- Support 30 concurrent games with active exchanges

#### NFR-002: Reliability
- Exchange operations MUST be atomic (all-or-nothing)
- System MUST recover gracefully from network failures
- Timer MUST continue accurately during reconnections
- No player MUST be lost during exchange

#### NFR-003: Usability
- Hostage selection MUST be mobile-friendly (touch targets ≥44px)
- Timer MUST be visible without scrolling
- Leader controls MUST be clearly distinguished
- Exchange animation MUST provide clear feedback

#### NFR-004: Security
- Only leaders CAN trigger hostage selection
- Only game host CAN start rounds (optional)
- Validate all selections server-side
- Prevent duplicate/invalid exchanges

#### NFR-005: Accessibility
- Timer MUST have ARIA live region for screen readers
- Color-blind friendly leader badges
- Keyboard navigation for hostage selection
- High contrast mode support

### Out of Scope (v1)

The following features will NOT be included in the initial release:

- ❌ Hostage negotiation phase
- ❌ Leader-to-leader chat
- ❌ Custom round durations
- ❌ Pause/resume round timer
- ❌ Variable round count (always 3 rounds)
- ❌ Leader role abilities (beyond voting)
- ❌ Hostage rejection mechanism
- ❌ Replay/review of past exchanges
- ❌ Vote history analytics

## User Stories

### Epic 1: Round Structure

**As a player**, I want to see a round timer, so I know how much time is left to strategize.

**Acceptance Criteria:**
- Timer displays MM:SS format
- Timer counts down every second
- Timer turns red when <30 seconds remain
- Timer is visible at top of game screen
- Timer syncs across all players

---

**As a player**, I want rounds to progress automatically, so the game maintains its pace.

**Acceptance Criteria:**
- Round 1 lasts 3 minutes
- Round 2 lasts 2 minutes
- Round 3 lasts 1 minute
- Notification shown when round ends
- Game advances to next round automatically

---

**As a player**, I want to know which round we're in, so I can adjust my strategy.

**Acceptance Criteria:**
- Round number (1, 2, or 3) displayed prominently
- Round changes trigger visual notification
- Round history visible in UI

### Epic 2: Leader Selection

**As a room member**, I want to know who my leader is, so I know who controls hostage selection.

**Acceptance Criteria:**
- Leader has distinct visual badge (👑 crown icon)
- Leader name highlighted in player list
- Leader card shows special privileges
- "You are the leader" message for leader

---

**As a game host**, I want leaders to be assigned automatically, so the game can start quickly.

**Acceptance Criteria:**
- Leaders randomly assigned at game start
- One leader per room
- Leaders cannot be the same person in both rooms
- Leaders announced to their rooms

---

**As a leader**, I want to understand my responsibilities, so I can perform my role correctly.

**Acceptance Criteria:**
- Leader card explains hostage selection
- UI shows number of hostages to select
- Help text available during selection
- Visual guides for first-time leaders

---

**As a leader**, I want to transfer leadership to another player, so I can delegate responsibility.

**Acceptance Criteria:**
- "Transfer Leadership" button visible to leader
- Click button to see list of room members
- Select player and confirm transfer
- Leadership badge moves to new leader
- All room members notified of change
- Cannot transfer during hostage selection

---

**As a room member**, I want to know when leadership changes, so I know who's in charge.

**Acceptance Criteria:**
- Notification: "[Old Leader] transferred leadership to [New Leader]"
- Crown badge moves to new leader in player list
- Leader panel appears for new leader
- Previous leader sees regular player UI

---

**As a room member**, I want to initiate a vote to remove the leader, so we can replace ineffective leadership.

**Acceptance Criteria:**
- "Vote to Remove Leader" button visible to non-leaders
- Click button to start vote
- All room members notified: "Vote started to remove [Leader]"
- Cannot start vote during hostage selection
- Cannot start vote if <3 players in room
- Cannot start vote if another vote is active

---

**As a room member**, I want to vote on leader removal, so I can participate in democratic decisions.

**Acceptance Criteria:**
- Vote dialog appears: "Remove [Leader] as leader?"
- "Yes" and "No" buttons
- Vote counter shows "X / Y voted"
- 30-second countdown timer
- Can only vote once
- Vote selection visible to self only

---

**As a room member**, I want to see vote results, so I know if the leader was removed.

**Acceptance Criteria:**
- Result notification: "Vote passed/failed (X Yes, Y No)"
- If passed: "[New Leader] is now the leader"
- If failed: "[Leader] remains leader"
- Vote dialog auto-closes after result shown
- 3-second cooldown before next vote can start

### Epic 3: Hostage Selection

**As a leader**, I want to select hostages from my room, so I can execute my team's strategy.

**Acceptance Criteria:**
- Click/tap players to select as hostages
- Selected players visually highlighted
- Counter shows N selected / N required
- Cannot select more than required number
- Cannot select myself

---

**As a leader**, I want to confirm my hostage selection, so I can finalize my choices.

**Acceptance Criteria:**
- "Announce Hostages" button enabled when correct count selected
- Confirmation dialog prevents accidental announcement
- Selection locks after announcement
- Room members see announced hostages

---

**As a non-leader**, I want to see who was selected as hostages, so I know who's leaving.

**Acceptance Criteria:**
- Hostages have visual indicator (🔄 exchange icon)
- List of hostages displayed
- "Waiting for other leader" message shown
- Cannot see other room's selection

---

**As a leader**, I want validation feedback, so I don't make invalid selections.

**Acceptance Criteria:**
- Error if trying to select self
- Error if selecting wrong number
- Error if selecting player not in room
- Clear error messages with guidance

### Epic 4: Hostage Exchange

**As a player**, I want to know when the exchange is happening, so I'm not confused by room changes.

**Acceptance Criteria:**
- "Hostage Exchange in Progress" message
- Animation shows players moving between rooms
- 3-second countdown before exchange
- Sound/visual effect during exchange

---

**As a hostage**, I want to see my new room assignment, so I know where I am.

**Acceptance Criteria:**
- Room assignment updates immediately
- "You've been moved to [ROOM]" notification
- New room player list displayed
- Role card shows new room location

---

**As a non-hostage**, I want to see who joined my room, so I can assess new players.

**Acceptance Criteria:**
- New players added to room list
- "[Player] joined from [OTHER_ROOM]" notification
- Player cards show arrival indicator
- Room count updates

---

**As a player**, I want the exchange to be fair, so both rooms trade equally.

**Acceptance Criteria:**
- Equal number of players exchanged
- Validation prevents unequal trades
- Exchange is atomic (all-or-nothing)
- No players lost during exchange

### Epic 5: Game Progression

**As a player**, I want clear indication when rounds end, so I know what's happening.

**Acceptance Criteria:**
- "Round N Complete" banner
- Summary of hostages exchanged
- "Next Round Starting" countdown
- New round timer starts automatically

---

**As a player**, I want the game to end after Round 3, so we can see the results.

**Acceptance Criteria:**
- No Round 4 exists
- Game transitions to reveal phase
- Final positions locked
- Results calculated and displayed

---

**As a player**, I want to see exchange history, so I can review what happened.

**Acceptance Criteria:**
- Log of all exchanges per round
- Who moved where
- Leader decisions visible (post-game)
- Exportable exchange history

## Game Flow

### High-Level Flow

```
Game Start
    ↓
Assign Players to Rooms
    ↓
Assign Roles
    ↓
┌──────────────────────────────────┐
│ Round 1 (3 minutes)              │
│   1. Assign Leaders              │
│   2. Players strategize          │
│   3. Leaders select hostages     │
│   4. Exchange hostages           │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│ Round 2 (2 minutes)              │
│   1. Assign Leaders              │
│   2. Players strategize          │
│   3. Leaders select hostages     │
│   4. Exchange hostages           │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│ Round 3 (1 minute)               │
│   1. Assign Leaders              │
│   2. Players strategize          │
│   3. Leaders select hostages     │
│   4. Exchange hostages           │
└──────────────────────────────────┘
    ↓
Reveal Phase
    ↓
Calculate Winner
```

### Detailed Round Flow

```
Round Start
    ↓
[1] Server: Assign Leaders
    ├─ Select random player from Red Room
    ├─ Select random player from Blue Room
    ├─ Broadcast LEADER_ASSIGNED event
    └─ Update game state
    ↓
[2] Server: Start Round Timer
    ├─ Set timer to round duration (3min/2min/1min)
    ├─ Broadcast ROUND_STARTED event
    └─ Timer counts down every second
    ↓
[3] Players: Strategy Phase (during timer)
    ├─ Share information
    ├─ Identify teammates
    └─ Plan hostage selection
    ↓
[4] Timer Expires / Host Forces End
    ├─ Broadcast ROUND_ENDING event
    └─ Enter hostage selection phase
    ↓
[5] Leaders: Select Hostages
    ├─ Red Leader selects N players
    ├─ Blue Leader selects N players
    ├─ Leaders click "Announce Hostages"
    └─ Selections locked
    ↓
[6] Server: Validate Selections
    ├─ Check equal count
    ├─ Check no self-selection
    ├─ Check valid players
    └─ Broadcast HOSTAGES_SELECTED event
    ↓
[7] Server: Execute Exchange
    ├─ Move Red hostages → Blue Room
    ├─ Move Blue hostages → Red Room
    ├─ Update player.currentRoom
    ├─ Preserve player.role
    └─ Broadcast EXCHANGE_COMPLETE event
    ↓
[8] Client: Update UI
    ├─ Move players in room lists
    ├─ Show notifications
    ├─ Update room counts
    └─ Display new arrivals
    ↓
Round Complete
    ├─ If round < 3: Start next round
    └─ If round = 3: Start reveal phase
```

### State Machine

```
┌─────────────────┐
│   WAITING       │  Initial state
└────────┬────────┘
         │ Host clicks "Start Game"
         ↓
┌─────────────────┐
│  ASSIGNING      │  Assigning roles & rooms
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  ROUND_SETUP    │  Assigning leaders
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  ROUND_ACTIVE   │◄──┐ Timer running, players strategize
└────────┬────────┘   │
         │            │
         ↓            │
┌─────────────────┐   │
│ SELECTING       │   │ Leaders selecting hostages
└────────┬────────┘   │
         │            │
         ↓            │
┌─────────────────┐   │
│ EXCHANGING      │   │ Executing exchange
└────────┬────────┘   │
         │            │
         ├────────────┘ Next round (if < 3)
         │
         ↓ Round 3 complete
┌─────────────────┐
│   REVEALING     │  Final reveal phase
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   COMPLETED     │  Game over
└─────────────────┘
```

## Technical Design

### Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  RoomPage      │  │  RoundTimer  │  │ LeaderPanel │ │
│  │  - Round info  │  │  - Countdown │  │ - Selection │ │
│  │  - Player list │  │  - Progress  │  │ - Announce  │ │
│  └────────────────┘  └──────────────┘  └─────────────┘ │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ HostageList    │  │ExchangeAnim  │  │RoundHistory │ │
│  │ - Selected     │  │ - Movement   │  │ - Past      │ │
│  │ - Pending      │  │ - Effects    │  │   exchanges │ │
│  └────────────────┘  └──────────────┘  └─────────────┘ │
└──────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket
                            │
┌──────────────────────────────────────────────────────────┐
│                     Backend (Go)                         │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐ │
│  │              WebSocket Handler                     │ │
│  │  - Broadcasts round events                         │ │
│  │  - Receives leader selections                      │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Round Manager                         │ │
│  │  - Timer goroutine                                 │ │
│  │  - Round progression                               │ │
│  │  - State transitions                               │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Exchange Service                      │ │
│  │  - Validate selections                             │ │
│  │  - Execute swaps                                   │ │
│  │  - Atomic operations                               │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                            │
                            │
┌──────────────────────────────────────────────────────────┐
│                     Data Layer                           │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐ │
│  │              In-Memory Store                       │ │
│  │  - Room state                                      │ │
│  │  - Round state                                     │ │
│  │  - Leader assignments                              │ │
│  │  - Hostage selections                              │ │
│  │  - Exchange history                                │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### Backend Components

##### 1. Round Manager (`internal/services/round_manager.go`)

**Responsibilities:**
- Manage round lifecycle (start, tick, end)
- Run timer goroutine per game session
- Trigger round transitions
- Emit round events via WebSocket

**Key Methods:**
```go
type RoundManager struct {
    hub         *websocket.Hub
    store       *store.MemoryStore
    timers      map[string]*RoundTimer  // gameSessionID -> timer
}

func (rm *RoundManager) StartRound(sessionID string, roundNum int) error
func (rm *RoundManager) GetRoundState(sessionID string) (*RoundState, error)
func (rm *RoundManager) EndRound(sessionID string) error
func (rm *RoundManager) TickTimer(sessionID string) error
```

##### 2. Leader Service (`internal/services/leader_service.go`)

**Responsibilities:**
- Assign leaders per room per round
- Validate leader actions
- Track leader selections
- Handle leadership transfers
- Manage leader disconnections

**Key Methods:**
```go
type LeaderService struct {
    store *store.MemoryStore
    hub   *websocket.Hub
}

func (ls *LeaderService) AssignLeaders(sessionID string) error
func (ls *LeaderService) GetLeader(sessionID, roomColor string) (*models.Player, error)
func (ls *LeaderService) IsLeader(sessionID, playerID string) bool
func (ls *LeaderService) TransferLeadership(sessionID, currentLeaderID, newLeaderID string) error
func (ls *LeaderService) HandleLeaderDisconnect(sessionID, leaderID string) error
func (ls *LeaderService) CanTransferLeadership(sessionID, roomColor string) bool
```

##### 3. Voting Service (`internal/services/voting_service.go`)

**Responsibilities:**
- Manage leader removal vote sessions
- Track votes per session
- Calculate vote results
- Handle vote timeouts
- Trigger leader reassignment on successful votes

**Key Methods:**
```go
type VotingService struct {
    store         *store.MemoryStore
    hub           *websocket.Hub
    leaderService *LeaderService
    sessions      map[string]*VoteSession  // voteID -> session
    mu            sync.RWMutex
}

func (vs *VotingService) StartVote(sessionID, initiatorID, targetLeaderID, roomColor string) error
func (vs *VotingService) CastVote(voteID, playerID string, vote VoteChoice) error
func (vs *VotingService) GetVoteSession(voteID string) (*VoteSession, error)
func (vs *VotingService) CompleteVote(voteID string) (*VoteResult, error)
func (vs *VotingService) HandleVoteTimeout(voteID string) error
func (vs *VotingService) CanStartVote(sessionID, roomColor string) bool
```

##### 4. Exchange Service (`internal/services/exchange_service.go`)

**Responsibilities:**
- Receive hostage selections from leaders
- Validate selections (count, eligibility)
- Execute atomic player swaps
- Emit exchange events

**Key Methods:**
```go
type ExchangeService struct {
    store *store.MemoryStore
    hub   *websocket.Hub
}

func (es *ExchangeService) SelectHostages(sessionID, leaderID string, hostageIDs []string) error
func (es *ExchangeService) ValidateSelections(sessionID string) error
func (es *ExchangeService) ExecuteExchange(sessionID string) error
```

#### Frontend Components

##### 1. RoundTimer Component

**Location:** `frontend/src/components/game/RoundTimer.tsx`

**Props:**
```typescript
interface RoundTimerProps {
  round: number;           // Current round (1, 2, 3)
  timeRemaining: number;   // Seconds remaining
  totalTime: number;       // Total round duration
}
```

**Features:**
- Circular progress bar
- MM:SS countdown
- Color changes (green → yellow → red)
- Pulse animation when <30s

##### 2. LeaderPanel Component

**Location:** `frontend/src/components/game/LeaderPanel.tsx`

**Props:**
```typescript
interface LeaderPanelProps {
  isLeader: boolean;
  hostageCount: number;
  players: Player[];
  selectedHostages: string[];
  onSelectHostage: (playerId: string) => void;
  onAnnounceHostages: () => void;
}
```

**Features:**
- Player selection checkboxes
- Counter: "N / N selected"
- "Announce Hostages" button
- Validation errors

##### 3. ExchangeAnimation Component

**Location:** `frontend/src/components/game/ExchangeAnimation.tsx`

**Features:**
- Player cards move between room columns
- 2-second animation duration
- "↔️ Exchange in Progress" overlay
- Confetti/particle effects

##### 4. LeaderTransferModal Component

**Location:** `frontend/src/components/game/LeaderTransferModal.tsx`

**Props:**
```typescript
interface LeaderTransferModalProps {
  isOpen: boolean;
  currentLeader: Player;
  roomPlayers: Player[];
  onTransfer: (newLeaderId: string) => void;
  onCancel: () => void;
  canTransfer: boolean;
}
```

**Features:**
- Modal dialog with player selection
- Radio buttons for room members
- Cannot select self
- Confirmation step: "Transfer to [Player]?"
- Disabled during hostage selection
- Shows reason if transfer blocked

##### 5. VoteDialog Component

**Location:** `frontend/src/components/game/VoteDialog.tsx`

**Props:**
```typescript
interface VoteDialogProps {
  isOpen: boolean;
  voteSession: VoteSession | null;
  hasVoted: boolean;
  onVote: (vote: 'YES' | 'NO') => void;
}
```

**Features:**
- Modal dialog for voting
- Shows target leader name
- "Remove" (YES) and "Keep" (NO) buttons
- Vote counter: "X / Y voted"
- 30-second countdown timer
- Disabled after voting
- Shows "Waiting for others..." after vote
- Auto-closes when vote completes

##### 6. RoundHistory Component

**Location:** `frontend/src/components/game/RoundHistory.tsx`

**Features:**
- Collapsible timeline of exchanges
- Shows who moved where each round
- Leader decisions
- Leadership transfer events
- Vote results
- Timestamps

### Data Flow

#### 1. Round Start Flow

```
[Host] Click "Start Round"
    ↓
[Frontend] POST /api/v1/rooms/:code/rounds/start
    ↓
[Backend] RoundManager.StartRound()
    ├─ Create RoundState
    ├─ LeaderService.AssignLeaders()
    ├─ Start timer goroutine
    └─ Broadcast ROUND_STARTED
    ↓
[Frontend] Receive ROUND_STARTED event
    ├─ Update round state
    ├─ Show timer
    ├─ Highlight leaders
    └─ Render LeaderPanel (if leader)
```

#### 2. Hostage Selection Flow

```
[Leader] Select players & click "Announce"
    ↓
[Frontend] WS: HOSTAGES_SELECTED
    └─ Payload: { leaderID, hostageIDs[] }
    ↓
[Backend] ExchangeService.SelectHostages()
    ├─ Validate count
    ├─ Validate no self-selection
    ├─ Validate players in room
    ├─ Store selection
    └─ Check if both leaders ready
    ↓
[Backend] If both ready:
    ├─ ExchangeService.ValidateSelections()
    └─ Broadcast BOTH_LEADERS_READY
    ↓
[Frontend] Show "Waiting for exchange..."
```

#### 3. Exchange Execution Flow

```
[Backend] Auto-trigger after both leaders ready
    ↓
ExchangeService.ExecuteExchange()
    ├─ Get Red hostages
    ├─ Get Blue hostages
    ├─ BEGIN TRANSACTION
    │   ├─ Update Red hostages → currentRoom = BLUE
    │   └─ Update Blue hostages → currentRoom = RED
    ├─ COMMIT TRANSACTION
    ├─ Log exchange in history
    └─ Broadcast EXCHANGE_COMPLETE
    ↓
[Frontend] Receive EXCHANGE_COMPLETE
    ├─ Play exchange animation (2s)
    ├─ Update player.currentRoom
    ├─ Re-render room player lists
    ├─ Show notifications
    └─ If round < 3: Wait for next round
       If round = 3: Navigate to reveal
```

#### 4. Leader Transfer Flow

```
[Leader] Click "Transfer Leadership" button
    ↓
[Frontend] Show LeaderTransferModal
    ├─ Display room members (excluding self)
    ├─ Radio button selection
    └─ "Confirm Transfer" button
    ↓
[Leader] Select new leader & confirm
    ↓
[Frontend] WS: LEADER_TRANSFERRED
    └─ Payload: { roomColor, newLeaderID }
    ↓
[Backend] LeaderService.TransferLeadership()
    ├─ Validate sender is current leader
    ├─ Validate new leader in same room
    ├─ Validate not in SELECTING phase
    ├─ Update RoundState.redLeaderID or blueLeaderID
    └─ Broadcast LEADERSHIP_CHANGED
    ↓
[Frontend] Receive LEADERSHIP_CHANGED (all room members)
    ├─ Update leader state
    ├─ Move crown badge to new leader
    ├─ Show notification: "[Old] → [New]"
    ├─ If you're new leader: Show LeaderPanel
    └─ If you're old leader: Hide LeaderPanel
```

#### 5. Vote to Remove Leader Flow

```
[Room Member] Click "Vote to Remove Leader"
    ↓
[Frontend] WS: VOTE_REMOVE_LEADER_STARTED
    └─ Payload: { roomColor, targetLeaderID }
    ↓
[Backend] VotingService.StartVote()
    ├─ Validate: not leader, ≥3 players, no active vote, not SELECTING
    ├─ Create VoteSession (voteID, timeout)
    ├─ Start 30-second timeout goroutine
    └─ Broadcast VOTE_SESSION_STARTED
    ↓
[Frontend] Receive VOTE_SESSION_STARTED (all room members)
    ├─ Show VoteDialog
    ├─ Display: "Remove [Leader] as leader?"
    ├─ Show countdown timer
    └─ Enable YES/NO buttons
    ↓
[Room Members] Click YES or NO
    ↓
[Frontend] WS: VOTE_CAST
    └─ Payload: { voteID, vote: "YES" or "NO" }
    ↓
[Backend] VotingService.CastVote()
    ├─ Validate: vote ID valid, player hasn't voted
    ├─ Record vote
    ├─ Broadcast VOTE_PROGRESS (count only, not individual votes)
    └─ If all voted: CompleteVote()
    ↓
[Frontend] Receive VOTE_PROGRESS
    ├─ Update counter: "3 / 5 voted"
    ├─ Disable vote buttons for self
    └─ Show "Waiting for others..."
    ↓
[Backend] When all voted OR timeout:
    ├─ VotingService.CompleteVote()
    ├─ Count YES vs NO
    ├─ If YES > 50%: LeaderService.AssignNewLeader()
    └─ Broadcast VOTE_COMPLETED
    ↓
[Frontend] Receive VOTE_COMPLETED
    ├─ Show result: "Vote passed/failed (X Yes, Y No)"
    ├─ If PASSED:
    │   ├─ Receive LEADERSHIP_CHANGED event
    │   ├─ Update leader badge
    │   └─ Show "[New Leader] is now the leader"
    ├─ If FAILED/TIMEOUT:
    │   └─ Show "[Leader] remains leader"
    └─ Close VoteDialog after 3 seconds
```

#### 6. Timer Tick Flow

```
[Backend] Timer goroutine (every 1 second)
    ↓
RoundManager.TickTimer(sessionID)
    ├─ Decrement timeRemaining
    ├─ Update RoundState
    └─ Broadcast TIMER_TICK
    ↓
[Frontend] Receive TIMER_TICK
    ├─ Update timer display
    └─ If timeRemaining = 0:
        ├─ Show "Round Ending" notification
        └─ Enable leader selection
```

## UI/UX Design

### Round Timer Design

**Location:** Top of game screen, always visible

```
┌─────────────────────────────────────────┐
│         Round 2 of 3                    │
│                                         │
│    ╭───────────────────╮                │
│    │    ●  1:45        │  ← Circular    │
│    │   ◠━━━━━━━◡       │     progress   │
│    ╰───────────────────╯                │
└─────────────────────────────────────────┘

States:
- Green (>60s): Normal
- Yellow (30-60s): Warning
- Red (<30s): Critical, pulse animation
```

### Leader Panel Design

**For Leaders Only**

```
┌──────────────────────────────────────────────┐
│ 👑 You are the Leader        [🔄 Transfer]  │
├──────────────────────────────────────────────┤
│ Select 1 hostage to send to Blue Room       │
│                                              │
│ ☐ Player 1  (You - Cannot select)           │
│ ☑ Player 2  ← Selected                      │
│ ☐ Player 3                                   │
│ ☐ Player 4                                   │
│                                              │
│ Selected: 1 / 1                              │
│                                              │
│ ┌────────────────────────────────┐          │
│ │   📢 Announce Hostages         │          │
│ └────────────────────────────────┘          │
└──────────────────────────────────────────────┘
```

**Transfer Leadership Button:**
- Located in top-right of leader panel
- Icon: 🔄 or ⇄
- Disabled during SELECTING phase
- Tooltip: "Transfer leadership to another player"

### Leader Transfer Modal Design

```
┌────────────────────────────────────────────┐
│          Transfer Leadership               │
├────────────────────────────────────────────┤
│ Select a new leader for your room:        │
│                                            │
│ ◯ Player 2  (Level 5, Active)             │
│ ◯ Player 3  (Level 2, Active)             │
│ ◯ Player 4  (Level 8, Active)             │
│                                            │
│ ⚠️ You cannot undo this action            │
│                                            │
│ ┌──────────────┐  ┌──────────────┐       │
│ │   Cancel     │  │   Confirm    │       │
│ └──────────────┘  └──────────────┘       │
└────────────────────────────────────────────┘
```

**Modal Features:**
- Radio button selection (single choice)
- Shows player status (online/offline)
- Confirmation required
- Cannot be dismissed by clicking outside
- ESC key cancels

### Vote Dialog Design

```
┌────────────────────────────────────────────┐
│          Remove Leader?                    │
├────────────────────────────────────────────┤
│ Vote to remove Alice as leader            │
│                                            │
│ Initiated by: Charlie                     │
│                                            │
│ ⏱️  Time remaining: 0:23                   │
│ 👥 Votes cast: 2 / 5                       │
│                                            │
│ ┌──────────────┐  ┌──────────────┐       │
│ │   ✅ Remove  │  │   ❌ Keep     │       │
│ └──────────────┘  └──────────────┘       │
└────────────────────────────────────────────┘
```

**After Voting:**
```
┌────────────────────────────────────────────┐
│          Remove Leader?                    │
├────────────────────────────────────────────┤
│ Vote to remove Alice as leader            │
│                                            │
│ ✓ You voted to remove                     │
│                                            │
│ ⏱️  Time remaining: 0:18                   │
│ 👥 Votes cast: 3 / 5                       │
│                                            │
│ Waiting for other players...              │
└────────────────────────────────────────────┘
```

**Vote Result:**
```
┌────────────────────────────────────────────┐
│          Vote Results                      │
├────────────────────────────────────────────┤
│ Vote to remove Alice: PASSED              │
│                                            │
│ ✅ Remove: 3 votes (60%)                  │
│ ❌ Keep: 2 votes (40%)                    │
│                                            │
│ 👑 Frank is now the leader                │
│                                            │
│ Closing in 3 seconds...                   │
└────────────────────────────────────────────┘
```

**Features:**
- Cannot be dismissed during active vote
- Auto-closes 3 seconds after result
- Progress bar for timeout
- Green/red color coding for votes
- Real-time vote count updates

### Exchange Animation

```
Red Room                     Blue Room
┌──────────┐                ┌──────────┐
│ Player 1 │                │ Player 5 │
│ Player 2 │ ─────────→     │ Player 6 │
│ Player 3 │ ←───────── │ Player 7 │
│ Player 4 │                │ Player 8 │
└──────────┘                └──────────┘

Animation:
1. Highlight hostages (1s)
2. Slide animations (1s)
3. Update lists (instant)
4. Show "Exchange Complete" (1s)
```

### Mobile Considerations

- **Timer:** Always sticky at top
- **Leader Panel:** Collapsible accordion
- **Hostage Selection:** Large touch targets (min 44px)
- **Exchange Animation:** Simplified on mobile (fade instead of slide)
- **Round History:** Bottom sheet modal

## API Specifications

### REST Endpoints

#### 1. Start Round

**Endpoint:** `POST /api/v1/rooms/:roomCode/rounds/start`

**Description:** Starts the next round (or Round 1 if first call)

**Authorization:** Game host only

**Request Body:**
```json
{}
```

**Response:** 200 OK
```json
{
  "roundNumber": 1,
  "duration": 180,
  "redLeader": "player-uuid-1",
  "blueLeader": "player-uuid-2",
  "hostageCount": 1
}
```

**Response:** 400 Bad Request
```json
{
  "error": "Game not in progress"
}
```

---

#### 2. Get Round State

**Endpoint:** `GET /api/v1/rooms/:roomCode/rounds/current`

**Description:** Get current round state

**Response:** 200 OK
```json
{
  "roundNumber": 2,
  "timeRemaining": 95,
  "duration": 120,
  "status": "ACTIVE",
  "redLeader": "player-uuid-3",
  "blueLeader": "player-uuid-4",
  "hostageCount": 1,
  "redHostagesSelected": false,
  "blueHostagesSelected": true
}
```

---

#### 3. End Round (Force)

**Endpoint:** `POST /api/v1/rooms/:roomCode/rounds/:roundNum/end`

**Description:** Force end current round (host only)

**Authorization:** Game host only

**Response:** 200 OK
```json
{
  "message": "Round ended",
  "nextRound": 3
}
```

### WebSocket Events

#### 1. ROUND_STARTED

**Direction:** Server → Client

**Payload:**
```json
{
  "type": "ROUND_STARTED",
  "payload": {
    "roundNumber": 1,
    "duration": 180,
    "timeRemaining": 180,
    "redLeader": {
      "id": "player-uuid-1",
      "nickname": "Alice"
    },
    "blueLeader": {
      "id": "player-uuid-2",
      "nickname": "Bob"
    },
    "hostageCount": 1
  }
}
```

---

#### 2. TIMER_TICK

**Direction:** Server → Client

**Payload:**
```json
{
  "type": "TIMER_TICK",
  "payload": {
    "roundNumber": 1,
    "timeRemaining": 179
  }
}
```

**Frequency:** Every 1 second

---

#### 3. HOSTAGES_SELECTED

**Direction:** Client → Server (Leader only)

**Payload:**
```json
{
  "type": "HOSTAGES_SELECTED",
  "payload": {
    "roomColor": "RED",
    "hostageIDs": ["player-uuid-5"]
  }
}
```

**Server Validation:**
- Sender is the leader of specified room
- Correct number of hostages
- All hostage IDs exist and are in the room
- Leader not in hostages

---

#### 4. LEADER_ANNOUNCED_HOSTAGES

**Direction:** Server → Client (Room-specific broadcast)

**Payload:**
```json
{
  "type": "LEADER_ANNOUNCED_HOSTAGES",
  "payload": {
    "roomColor": "RED",
    "hostages": [
      {
        "id": "player-uuid-5",
        "nickname": "Charlie"
      }
    ],
    "waitingForOtherLeader": true
  }
}
```

---

#### 5. EXCHANGE_READY

**Direction:** Server → Client (All players)

**Payload:**
```json
{
  "type": "EXCHANGE_READY",
  "payload": {
    "redHostages": ["player-uuid-5"],
    "blueHostages": ["player-uuid-9"],
    "countdown": 3
  }
}
```

---

#### 6. EXCHANGE_COMPLETE

**Direction:** Server → Client (All players)

**Payload:**
```json
{
  "type": "EXCHANGE_COMPLETE",
  "payload": {
    "roundNumber": 1,
    "exchanges": [
      {
        "playerID": "player-uuid-5",
        "nickname": "Charlie",
        "from": "RED_ROOM",
        "to": "BLUE_ROOM"
      },
      {
        "playerID": "player-uuid-9",
        "nickname": "Diana",
        "from": "BLUE_ROOM",
        "to": "RED_ROOM"
      }
    ],
    "nextRound": 2
  }
}
```

---

#### 7. LEADER_TRANSFERRED

**Direction:** Client → Server (Leader only)

**Payload:**
```json
{
  "type": "LEADER_TRANSFERRED",
  "payload": {
    "roomColor": "RED",
    "newLeaderID": "player-uuid-10"
  }
}
```

**Server Validation:**
- Sender is current leader of specified room
- New leader exists and is in the same room
- Round is not in SELECTING phase
- New leader is not already a leader

---

#### 8. LEADERSHIP_CHANGED

**Direction:** Server → Client (Room-specific broadcast)

**Payload:**
```json
{
  "type": "LEADERSHIP_CHANGED",
  "payload": {
    "roomColor": "RED",
    "oldLeader": {
      "id": "player-uuid-1",
      "nickname": "Alice"
    },
    "newLeader": {
      "id": "player-uuid-10",
      "nickname": "Frank"
    },
    "reason": "VOLUNTARY_TRANSFER",
    "timestamp": "2025-11-08T10:30:45Z"
  }
}
```

**Reasons:**
- `VOLUNTARY_TRANSFER`: Leader manually transferred
- `DISCONNECTION`: Leader disconnected
- `ROLE_ABILITY`: Role-specific forced transfer (future)

---

#### 9. VOTE_REMOVE_LEADER_STARTED

**Direction:** Client → Server (Any room member except leader)

**Payload:**
```json
{
  "type": "VOTE_REMOVE_LEADER_STARTED",
  "payload": {
    "roomColor": "RED",
    "targetLeaderID": "player-uuid-1"
  }
}
```

**Server Validation:**
- Sender is in the specified room
- Sender is not the leader
- At least 3 players in room
- No active vote in progress
- Round is not in SELECTING phase

---

#### 10. VOTE_SESSION_STARTED

**Direction:** Server → Client (Room-specific broadcast)

**Payload:**
```json
{
  "type": "VOTE_SESSION_STARTED",
  "payload": {
    "voteID": "vote-uuid-123",
    "roomColor": "RED",
    "targetLeader": {
      "id": "player-uuid-1",
      "nickname": "Alice"
    },
    "initiator": {
      "id": "player-uuid-5",
      "nickname": "Charlie"
    },
    "totalVoters": 5,
    "timeoutSeconds": 30,
    "startedAt": "2025-11-08T10:35:00Z"
  }
}
```

---

#### 11. VOTE_CAST

**Direction:** Client → Server

**Payload:**
```json
{
  "type": "VOTE_CAST",
  "payload": {
    "voteID": "vote-uuid-123",
    "vote": "YES"
  }
}
```

**Vote Options:**
- `YES`: Remove leader
- `NO`: Keep leader

**Server Validation:**
- Vote ID is valid and active
- Player hasn't already voted
- Player is in the room being voted on

---

#### 12. VOTE_PROGRESS

**Direction:** Server → Client (Room-specific broadcast)

**Payload:**
```json
{
  "type": "VOTE_PROGRESS",
  "payload": {
    "voteID": "vote-uuid-123",
    "votedCount": 3,
    "totalVoters": 5,
    "timeRemaining": 22
  }
}
```

**Note:** Individual votes (YES/NO) are NOT broadcast to preserve vote privacy

---

#### 13. VOTE_COMPLETED

**Direction:** Server → Client (Room-specific broadcast)

**Payload:**
```json
{
  "type": "VOTE_COMPLETED",
  "payload": {
    "voteID": "vote-uuid-123",
    "result": "PASSED",
    "yesVotes": 3,
    "noVotes": 2,
    "targetLeader": {
      "id": "player-uuid-1",
      "nickname": "Alice"
    },
    "newLeader": {
      "id": "player-uuid-10",
      "nickname": "Frank"
    },
    "reason": "MAJORITY_VOTE"
  }
}
```

**Result Types:**
- `PASSED`: Majority voted YES, leader removed
- `FAILED`: Majority voted NO, leader remains
- `TIMEOUT`: Not enough votes within 30 seconds, leader remains

---

#### 14. ROUND_ENDED

**Direction:** Server → Client

**Payload:**
```json
{
  "type": "ROUND_ENDED",
  "payload": {
    "roundNumber": 3,
    "finalRound": true,
    "nextPhase": "REVEALING"
  }
}
```

## Data Models

### RoundState

**File:** `backend/internal/models/round_state.go`

```go
type RoundState struct {
    GameSessionID  string    `json:"gameSessionId"`
    RoundNumber    int       `json:"roundNumber"`    // 1, 2, or 3
    Duration       int       `json:"duration"`       // Total seconds (180/120/60)
    TimeRemaining  int       `json:"timeRemaining"`  // Seconds left
    Status         string    `json:"status"`         // SETUP, ACTIVE, SELECTING, EXCHANGING, COMPLETE
    RedLeaderID    string    `json:"redLeaderId"`
    BlueLeaderID   string    `json:"blueLeaderId"`
    HostageCount   int       `json:"hostageCount"`   // Based on player count
    RedHostages    []string  `json:"redHostages"`    // Player IDs
    BlueHostages   []string  `json:"blueHostages"`   // Player IDs
    StartedAt      time.Time `json:"startedAt"`
    EndedAt        *time.Time `json:"endedAt,omitempty"`
}
```

### ExchangeHistory

**File:** `backend/internal/models/exchange_history.go`

```go
type ExchangeRecord struct {
    RoundNumber  int       `json:"roundNumber"`
    PlayerID     string    `json:"playerId"`
    PlayerName   string    `json:"playerName"`
    FromRoom     RoomColor `json:"fromRoom"`
    ToRoom       RoomColor `json:"toRoom"`
    Timestamp    time.Time `json:"timestamp"`
}

type ExchangeHistory struct {
    GameSessionID string           `json:"gameSessionId"`
    Exchanges     []ExchangeRecord `json:"exchanges"`
}
```

### Updated GameSession

**File:** `backend/internal/models/game_session.go`

```go
type GameSession struct {
    // ... existing fields ...

    // Round management
    CurrentRound    int               `json:"currentRound"`    // 1, 2, 3
    RoundState      *RoundState       `json:"roundState,omitempty"`
    ExchangeHistory *ExchangeHistory  `json:"exchangeHistory,omitempty"`
}
```

### Frontend Types

**File:** `frontend/src/types/game.types.ts`

```typescript
export interface RoundState {
  gameSessionId: string;
  roundNumber: number;        // 1, 2, 3
  duration: number;           // 180, 120, 60
  timeRemaining: number;      // Seconds
  status: 'SETUP' | 'ACTIVE' | 'SELECTING' | 'EXCHANGING' | 'COMPLETE';
  redLeaderId: string;
  blueLeaderId: string;
  hostageCount: number;
  redHostages: string[];
  blueHostages: string[];
  startedAt: string;
  endedAt?: string;
}

export interface ExchangeRecord {
  roundNumber: number;
  playerId: string;
  playerName: string;
  fromRoom: RoomColor;
  toRoom: RoomColor;
  timestamp: string;
}

export interface LeaderInfo {
  id: string;
  nickname: string;
}

export interface VoteSession {
  voteID: string;
  gameSessionId: string;
  roomColor: RoomColor;
  targetLeaderId: string;
  targetLeaderName: string;
  initiatorId: string;
  initiatorName: string;
  startedAt: string;
  expiresAt: string;
  timeoutSeconds: number;
  totalVoters: number;
  votes: Map<string, VoteChoice>;  // playerID -> YES/NO
  status: 'ACTIVE' | 'COMPLETED' | 'TIMEOUT';
}

export type VoteChoice = 'YES' | 'NO';

export interface VoteResult {
  voteID: string;
  result: 'PASSED' | 'FAILED' | 'TIMEOUT';
  yesVotes: number;
  noVotes: number;
  totalVoters: number;
  newLeaderId?: string;
  newLeaderName?: string;
}
```

### Backend VoteSession Model

**File:** `backend/internal/models/vote_session.go`

```go
type VoteChoice string

const (
    VoteYes VoteChoice = "YES"
    VoteNo  VoteChoice = "NO"
)

type VoteSessionStatus string

const (
    VoteActive    VoteSessionStatus = "ACTIVE"
    VoteCompleted VoteSessionStatus = "COMPLETED"
    VoteTimeout   VoteSessionStatus = "TIMEOUT"
)

type VoteSession struct {
    VoteID           string            `json:"voteId"`
    GameSessionID    string            `json:"gameSessionId"`
    RoomColor        RoomColor         `json:"roomColor"`
    TargetLeaderID   string            `json:"targetLeaderId"`
    TargetLeaderName string            `json:"targetLeaderName"`
    InitiatorID      string            `json:"initiatorId"`
    InitiatorName    string            `json:"initiatorName"`
    StartedAt        time.Time         `json:"startedAt"`
    ExpiresAt        time.Time         `json:"expiresAt"`
    TimeoutSeconds   int               `json:"timeoutSeconds"`
    TotalVoters      int               `json:"totalVoters"`
    Votes            map[string]VoteChoice `json:"votes"`  // playerID -> YES/NO
    Status           VoteSessionStatus `json:"status"`
}

type VoteResult struct {
    VoteID         string    `json:"voteId"`
    Result         string    `json:"result"`  // PASSED, FAILED, TIMEOUT
    YesVotes       int       `json:"yesVotes"`
    NoVotes        int       `json:"noVotes"`
    TotalVoters    int       `json:"totalVoters"`
    NewLeaderID    string    `json:"newLeaderId,omitempty"`
    NewLeaderName  string    `json:"newLeaderName,omitempty"`
}
```

## Security & Validation

### Server-Side Validation

#### Leadership Transfer

```go
func (ls *LeaderService) ValidateLeadershipTransfer(
    sessionID, currentLeaderID, newLeaderID string,
) error {
    // 1. Verify sender is actually current leader
    isLeader := ls.IsLeader(sessionID, currentLeaderID)
    if !isLeader {
        return errors.New("only current leader can transfer leadership")
    }

    // 2. Get round state
    roundState, err := ls.roundManager.GetRoundState(sessionID)
    if err != nil {
        return err
    }

    // 3. Verify not in SELECTING phase
    if roundState.Status == "SELECTING" {
        return errors.New("cannot transfer leadership during hostage selection")
    }

    // 4. Verify new leader exists
    newLeader := ls.store.GetPlayer(sessionID, newLeaderID)
    if newLeader == nil {
        return errors.New("invalid new leader ID")
    }

    // 5. Verify new leader is in same room
    currentLeader := ls.store.GetPlayer(sessionID, currentLeaderID)
    if newLeader.CurrentRoom != currentLeader.CurrentRoom {
        return errors.New("new leader must be in same room")
    }

    // 6. Verify new leader is not already a leader
    if newLeaderID == roundState.RedLeaderID || newLeaderID == roundState.BlueLeaderID {
        return errors.New("player is already a leader")
    }

    // 7. Verify new leader is online
    if !newLeader.IsConnected {
        return errors.New("new leader must be online")
    }

    return nil
}
```

#### Vote Initiation

```go
func (vs *VotingService) ValidateVoteStart(
    sessionID, initiatorID, targetLeaderID, roomColor string,
) error {
    // 1. Verify initiator exists and is in specified room
    initiator := vs.store.GetPlayer(sessionID, initiatorID)
    if initiator == nil {
        return errors.New("invalid initiator")
    }
    if string(initiator.CurrentRoom) != roomColor {
        return errors.New("initiator not in specified room")
    }

    // 2. Verify initiator is not the leader
    isLeader := vs.leaderService.IsLeader(sessionID, initiatorID)
    if isLeader {
        return errors.New("leader cannot vote to remove themselves")
    }

    // 3. Get round state
    roundState, err := vs.roundManager.GetRoundState(sessionID)
    if err != nil {
        return err
    }

    // 4. Verify not in SELECTING phase
    if roundState.Status == "SELECTING" {
        return errors.New("cannot start vote during hostage selection")
    }

    // 5. Verify target is actually a leader
    targetIsLeader := vs.leaderService.IsLeader(sessionID, targetLeaderID)
    if !targetIsLeader {
        return errors.New("target is not a leader")
    }

    // 6. Verify minimum players in room
    playersInRoom := vs.store.GetPlayersInRoom(sessionID, roomColor)
    if len(playersInRoom) < 3 {
        return errors.New("minimum 3 players required to start vote")
    }

    // 7. Verify no active vote in room
    activeVote := vs.GetActiveVoteForRoom(sessionID, roomColor)
    if activeVote != nil {
        return errors.New("another vote is already in progress")
    }

    return nil
}
```

#### Vote Casting

```go
func (vs *VotingService) ValidateVoteCast(
    voteID, playerID string,
    vote VoteChoice,
) error {
    // 1. Verify vote session exists and is active
    session := vs.GetVoteSession(voteID)
    if session == nil {
        return errors.New("invalid vote ID")
    }
    if session.Status != VoteActive {
        return errors.New("vote session is not active")
    }

    // 2. Verify player is in the room
    player := vs.store.GetPlayer(session.GameSessionID, playerID)
    if player == nil {
        return errors.New("invalid player ID")
    }
    if string(player.CurrentRoom) != session.RoomColor {
        return errors.New("player not in voting room")
    }

    // 3. Verify player hasn't already voted
    if _, hasVoted := session.Votes[playerID]; hasVoted {
        return errors.New("player has already voted")
    }

    // 4. Verify vote is YES or NO
    if vote != VoteYes && vote != VoteNo {
        return errors.New("invalid vote choice")
    }

    return nil
}
```

#### Hostage Selection

```go
func (es *ExchangeService) ValidateHostageSelection(
    sessionID, leaderID string,
    hostageIDs []string,
) error {
    // 1. Verify sender is actually a leader
    isLeader := es.leaderService.IsLeader(sessionID, leaderID)
    if !isLeader {
        return errors.New("only leaders can select hostages")
    }

    // 2. Get round state
    roundState, err := es.roundManager.GetRoundState(sessionID)
    if err != nil {
        return err
    }

    // 3. Verify correct count
    if len(hostageIDs) != roundState.HostageCount {
        return fmt.Errorf("must select exactly %d hostages", roundState.HostageCount)
    }

    // 4. Verify leader not selecting self
    for _, hid := range hostageIDs {
        if hid == leaderID {
            return errors.New("leader cannot select themselves")
        }
    }

    // 5. Verify all players exist and are in leader's room
    leaderRoom := es.getPlayerRoom(sessionID, leaderID)
    for _, hid := range hostageIDs {
        player := es.store.GetPlayer(sessionID, hid)
        if player == nil {
            return errors.New("invalid player ID")
        }
        if player.CurrentRoom != leaderRoom {
            return errors.New("can only select players in your room")
        }
    }

    // 6. Verify no duplicates
    seen := make(map[string]bool)
    for _, hid := range hostageIDs {
        if seen[hid] {
            return errors.New("duplicate player in selection")
        }
        seen[hid] = true
    }

    return nil
}
```

#### Exchange Execution

```go
func (es *ExchangeService) ExecuteExchange(sessionID string) error {
    // Atomic operation - all or nothing
    es.mu.Lock()
    defer es.mu.Unlock()

    roundState, err := es.roundManager.GetRoundState(sessionID)
    if err != nil {
        return err
    }

    // Verify both leaders have selected
    if len(roundState.RedHostages) == 0 || len(roundState.BlueHostages) == 0 {
        return errors.New("both leaders must select hostages")
    }

    // Verify equal counts
    if len(roundState.RedHostages) != len(roundState.BlueHostages) {
        return errors.New("unequal hostage counts")
    }

    // Execute swaps atomically
    err = es.store.Transaction(func(tx *Transaction) error {
        // Move Red → Blue
        for _, playerID := range roundState.RedHostages {
            player := tx.GetPlayer(sessionID, playerID)
            player.CurrentRoom = models.BlueRoom
            tx.UpdatePlayer(player)
        }

        // Move Blue → Red
        for _, playerID := range roundState.BlueHostages {
            player := tx.GetPlayer(sessionID, playerID)
            player.CurrentRoom = models.RedRoom
            tx.UpdatePlayer(player)
        }

        return nil
    })

    if err != nil {
        log.Printf("[ERROR] Exchange failed: %v", err)
        return err
    }

    // Log exchange
    es.logExchange(sessionID, roundState)

    return nil
}
```

### Rate Limiting

- **Leader Selection:** Max 1 change per 5 seconds
- **Hostage Announcement:** Max 1 per round per leader
- **Force End Round:** Max 1 per 10 seconds (host only)

### Authorization

```go
// Middleware to verify game host
func HostOnly(c *gin.Context) {
    roomCode := c.Param("roomCode")
    userID := c.GetHeader("X-Player-ID")

    room := store.GetRoom(roomCode)
    if room == nil || room.OwnerID != userID {
        c.JSON(403, gin.H{"error": "host only"})
        c.Abort()
        return
    }

    c.Next()
}
```

## Testing Strategy

### Unit Tests

#### Backend

1. **Round Manager Tests** (`round_manager_test.go`)
   - ✅ Start round creates state correctly
   - ✅ Timer ticks every second
   - ✅ Timer expires triggers SELECTING phase
   - ✅ Multiple games can run simultaneously

2. **Leader Service Tests** (`leader_service_test.go`)
   - ✅ Assign leaders selects one per room
   - ✅ Leaders are different players
   - ✅ Leader assignments persist across rounds
   - ✅ IsLeader() validates correctly
   - ✅ Transfer leadership updates state correctly
   - ✅ Reject transfer during SELECTING phase
   - ✅ Reject transfer to player in different room
   - ✅ Reject transfer to offline player
   - ✅ Reject transfer from non-leader
   - ✅ Broadcast LEADERSHIP_CHANGED event
   - ✅ Handle leader disconnection (auto-reassign)

3. **Voting Service Tests** (`voting_service_test.go`)
   - ✅ Start vote creates session correctly
   - ✅ Reject vote start during SELECTING phase
   - ✅ Reject vote start with <3 players
   - ✅ Reject vote start when vote already active
   - ✅ Reject vote start by leader
   - ✅ Cast vote records correctly
   - ✅ Reject duplicate votes
   - ✅ Calculate majority correctly (>50%)
   - ✅ Handle timeout (no majority)
   - ✅ Trigger leader reassignment on PASSED
   - ✅ Broadcast VOTE_COMPLETED event
   - ✅ Clean up expired vote sessions

4. **Exchange Service Tests** (`exchange_service_test.go`)
   - ✅ Validate hostage count
   - ✅ Reject self-selection
   - ✅ Reject invalid player IDs
   - ✅ Reject players from wrong room
   - ✅ Execute exchange swaps players correctly
   - ✅ Preserve player roles during exchange
   - ✅ Log exchanges in history

#### Frontend

1. **RoundTimer Tests** (`RoundTimer.test.tsx`)
   - ✅ Displays time in MM:SS format
   - ✅ Updates every second
   - ✅ Changes color based on time remaining
   - ✅ Shows pulse animation when critical

2. **LeaderPanel Tests** (`LeaderPanel.test.tsx`)
   - ✅ Only visible to leaders
   - ✅ Can select/deselect players
   - ✅ Cannot select self
   - ✅ Announce button disabled until correct count
   - ✅ Shows validation errors

3. **LeaderTransferModal Tests** (`LeaderTransferModal.test.tsx`)
   - ✅ Only shown when leader clicks transfer button
   - ✅ Displays room members (excluding current leader)
   - ✅ Cannot select offline players
   - ✅ Shows confirmation dialog
   - ✅ Emits LEADER_TRANSFERRED event on confirm
   - ✅ Closes on cancel
   - ✅ Disabled during SELECTING phase

4. **VoteDialog Tests** (`VoteDialog.test.tsx`)
   - ✅ Displays vote session info correctly
   - ✅ Shows countdown timer
   - ✅ Enables YES/NO buttons when vote active
   - ✅ Disables buttons after voting
   - ✅ Shows "Waiting for others..." after vote
   - ✅ Displays vote progress counter
   - ✅ Shows vote result correctly
   - ✅ Auto-closes after result shown
   - ✅ Cannot be manually dismissed during vote

5. **ExchangeAnimation Tests** (`ExchangeAnimation.test.tsx`)
   - ✅ Animates player movement
   - ✅ Updates room lists after animation
   - ✅ Shows correct notifications

### Integration Tests

1. **Full Round Cycle**
   - Start game → Assign leaders → Timer runs → Select hostages → Execute exchange → Next round

2. **Leader Vote Cycle**
   - Start vote → All players vote → Result broadcast → Leader reassigned (if passed)

3. **Concurrent Games**
   - 10 games running simultaneously with exchanges and votes

4. **WebSocket Synchronization**
   - All players receive events in correct order
   - No race conditions during exchanges or votes

5. **Error Recovery**
   - Network interruption during exchange
   - Network interruption during vote
   - Server restart mid-round
   - Leader disconnects during selection
   - Vote initiator disconnects during vote
   - Vote timeout handling

### E2E Tests (Playwright)

```typescript
test('complete round with hostage exchange', async ({ page }) => {
  // 1. Create game with 6 players
  await createGame(page, 6);

  // 2. Start game
  await page.click('[data-testid="start-game"]');

  // 3. Verify Round 1 started
  await expect(page.locator('[data-testid="round-number"]')).toHaveText('1');
  await expect(page.locator('[data-testid="timer"]')).toContainText('3:00');

  // 4. Verify leaders assigned
  const redLeader = await page.locator('[data-testid="red-leader"]').textContent();
  const blueLeader = await page.locator('[data-testid="blue-leader"]').textContent();
  expect(redLeader).toBeTruthy();
  expect(blueLeader).toBeTruthy();
  expect(redLeader).not.toBe(blueLeader);

  // 5. Red leader selects hostage
  await page.click(`[data-testid="player-checkbox-${playerId}"]`);
  await page.click('[data-testid="announce-hostages"]');

  // 6. Blue leader selects hostage
  // ... (in separate browser context)

  // 7. Verify exchange animation plays
  await expect(page.locator('[data-testid="exchange-animation"]')).toBeVisible();

  // 8. Verify players moved rooms
  await expect(page.locator(`[data-testid="player-${playerId}-room"]`)).toHaveText('Blue Room');

  // 9. Verify Round 2 started
  await expect(page.locator('[data-testid="round-number"]')).toHaveText('2');
});
```

### Performance Tests

- **Timer Accuracy:** Measure jitter over 100 rounds (should be <100ms)
- **Exchange Latency:** Measure time from selection to UI update (should be <2s)
- **Concurrent Load:** 100 concurrent games with exchanges (no errors)
- **Memory Leaks:** Run 1000 rounds, check memory usage (should be stable)

## Deployment Plan

### Phase 1: Backend Foundation (Days 1-3)

**Tasks:**
1. Create round_manager.go
2. Create leader_service.go (with transfer functionality)
3. Create voting_service.go (vote to remove leader)
4. Create exchange_service.go
5. Add REST endpoints
6. Add WebSocket events (LEADER_TRANSFERRED, LEADERSHIP_CHANGED, VOTE_*, etc.)
7. Write unit tests
8. Write integration tests

**Deliverables:**
- ✅ Round management API
- ✅ Leader assignment logic
- ✅ Leadership transfer logic
- ✅ Leader voting/removal system
- ✅ Vote timeout handling
- ✅ Leader disconnection handling
- ✅ Exchange execution logic
- ✅ 90%+ test coverage

### Phase 2: Frontend Components (Days 4-6)

**Tasks:**
1. Create RoundTimer component
2. Create LeaderPanel component (with transfer button)
3. Create LeaderTransferModal component
4. Create VoteDialog component
5. Create ExchangeAnimation component
6. Create RoundHistory component
7. Update RoomPage to integrate components
8. Add WebSocket event handlers (LEADERSHIP_CHANGED, VOTE_*, etc.)
9. Write component tests

**Deliverables:**
- ✅ All UI components
- ✅ Leadership transfer UI
- ✅ Voting UI with real-time updates
- ✅ WebSocket integration
- ✅ Animation effects
- ✅ Mobile-responsive design

### Phase 3: Integration & Testing (Days 7-9)

**Tasks:**
1. End-to-end testing with real games
2. Performance testing (timer accuracy, exchange latency)
3. Bug fixes
4. UI polish
5. Accessibility improvements
6. Documentation updates

**Deliverables:**
- ✅ E2E test suite
- ✅ Performance benchmarks met
- ✅ Zero critical bugs
- ✅ User documentation

### Phase 4: Deployment (Day 10)

**Tasks:**
1. Deploy to staging
2. Smoke tests
3. Deploy to production
4. Monitor metrics
5. Hotfix if needed

**Deliverables:**
- ✅ Production deployment
- ✅ Monitoring dashboards
- ✅ Rollback plan

### Rollout Strategy

**Beta Testing (Week 1):**
- Enable for 10% of games
- Monitor error rates
- Collect user feedback

**Gradual Rollout (Week 2):**
- 25% of games
- 50% of games
- 100% of games

**Monitoring:**
- Exchange success rate
- Average round duration
- Timer accuracy
- WebSocket latency
- Error rates

### Rollback Plan

**Triggers:**
- Exchange failure rate >5%
- Timer drift >2 seconds
- Critical bugs affecting gameplay

**Rollback Steps:**
1. Disable round system via feature flag
2. Revert to continuous gameplay mode
3. Investigate and fix issues
4. Re-deploy with fixes

## Success Criteria

### Launch Criteria

- ✅ All unit tests passing (90%+ coverage)
- ✅ All integration tests passing
- ✅ E2E tests passing for critical flows
- ✅ Performance benchmarks met
- ✅ Security review completed
- ✅ Documentation complete
- ✅ Zero critical bugs
- ✅ Beta testing successful (>90% exchange success rate)

### Post-Launch Metrics (Week 1)

- ✅ 95%+ exchange success rate
- ✅ <2% timer drift
- ✅ <1% WebSocket disconnections during exchanges
- ✅ Average round completion time within expected range
- ✅ Zero data corruption incidents

### Long-Term Success (Month 1)

- ✅ 80%+ of players complete all 3 rounds
- ✅ 90%+ player satisfaction (surveys)
- ✅ Feature adoption rate >70%
- ✅ <1% of games require manual intervention

## Future Enhancements

### v2 Features (Not in Scope for v1)

1. **Democratic Leader Voting**
   - Players vote for leader
   - Majority wins
   - Voting UI

2. **Leader Negotiation Phase**
   - 30-second leader-to-leader chat
   - Private messaging
   - Hostage negotiation

3. **Custom Round Configuration**
   - Host can set round durations
   - Variable round counts (2, 3, 4, or 5 rounds)
   - Custom hostage counts

4. **Pause/Resume**
   - Host can pause timer
   - Consensus pause (majority vote)
   - Auto-resume after timeout

5. **Leader Abilities**
   - Special powers for leaders
   - Veto hostage selections
   - Force reveal

6. **Exchange History Export**
   - Download as JSON
   - Visual timeline
   - Replay feature

7. **Advanced Analytics**
   - Optimal strategy suggestions
   - Win rate by hostage selection patterns
   - Player movement heatmaps

---

**Document Version:** 1.2
**Author:** Claude (AI Assistant)
**Review Status:** Draft
**Last Updated:** 2025-11-08 (Added leadership transfer mechanics + democratic leader removal voting)
**Next Review:** After stakeholder feedback
