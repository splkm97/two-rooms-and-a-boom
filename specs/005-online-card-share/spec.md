# Feature 005: Online Card Share System

## Overview

Implement a digital card-sharing system that allows players to reveal their role information to other players through the app interface, supporting both color-only shares and full card reveals with a handshake (mutual consent) mechanism.

**Feature ID:** 005-online-card-share
**Priority:** High
**Status:** Planning
**Created:** 2025-11-10
**Last Updated:** 2025-11-10

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

### What is Card Sharing?

In the physical version of Two Rooms and a Boom, players strategically reveal their role cards to other players to:
- **Build trust** by showing team affiliation
- **Identify teammates** through color reveals
- **Deceive opponents** using spy abilities (spies show opposite team color)
- **Coordinate strategy** through selective information sharing

### Current Limitations

Currently, the game implementation:
- ❌ No mechanism for players to share role information digitally
- ❌ Players must share information verbally only
- ❌ No way to verify claims or coordinate visually
- ❌ Spy deception mechanics not supported digitally

This feature will:
- ✅ Enable digital card sharing with consent mechanism
- ✅ Support both color-only and full card reveals
- ✅ Implement spy deception mechanics (false color display)
- ✅ Track sharing history for post-game analysis
- ✅ Provide visual feedback for shared information

### Share Types

1. **Color Share (Team Color Only)**
   - Shows only team color (Red/Blue)
   - Spies show **opposite** team color (deception mechanic)
   - Quick way to establish basic trust
   - Lower information risk

2. **Full Card Share (Complete Information)**
   - Shows role name, team color, and role type
   - Spies still show opposite team color but reveal they are spies
   - High information value
   - Requires more trust

### Handshake Mechanism

To prevent unsolicited information and maintain game balance:
- Player A initiates share request to Player B
- Player B receives notification and can **accept** or **decline**
- Only upon acceptance does Player A's card get revealed to Player B
- Declined requests notify Player A
- Timeout after 30 seconds if no response

## Goals & Success Metrics

### Primary Goals

1. **Implement Share Request System**
   - Players can select another player to share with
   - Choose between color-only or full card share
   - Send share request via WebSocket

2. **Create Handshake Mechanism**
   - Target player receives notification
   - Accept/Decline buttons with clear UI
   - 30-second timeout
   - Real-time response handling

3. **Build Card Display System**
   - Visual card representation
   - Color-only view (simplified)
   - Full card view (detailed)
   - Spy deception logic (show opposite color)

4. **Track Share History**
   - Record all share requests and responses
   - Track who shared what with whom
   - Display history in game recap
   - Export history for analysis

5. **Handle Edge Cases**
   - Multiple simultaneous requests
   - Player disconnection during handshake
   - Spy role deception mechanics
   - Request cancellation

### Success Metrics

#### Functional Metrics
- ✅ 100% of share requests delivered within 500ms
- ✅ 95%+ of handshake acceptances complete successfully
- ✅ Spy deception works correctly (shows opposite color)
- ✅ Share history accuracy 100%
- ✅ Zero information leaks (only accepted shares visible)

#### User Experience Metrics
- ✅ 80%+ of players understand handshake mechanism on first use
- ✅ Average response time to share requests < 10 seconds
- ✅ <5% of share requests timeout
- ✅ 90%+ player satisfaction with card sharing UX

#### Technical Metrics
- ✅ WebSocket latency < 100ms for share events
- ✅ Support 100 concurrent share requests
- ✅ Share history storage < 1MB per game
- ✅ Zero data corruption in share records

## Requirements

### Functional Requirements

#### FR-001: Share Request Initiation
- **FR-001.1:** Player MUST be able to select any other player in the SAME ROOM
- **FR-001.2:** System MUST prevent sharing with players in different rooms
- **FR-001.3:** Player MUST choose share type: COLOR_ONLY or FULL_CARD
- **FR-001.4:** System MUST validate player is in active game
- **FR-001.5:** System MUST prevent sharing with disconnected players
- **FR-001.6:** Request MUST be delivered via WebSocket
- **FR-001.7:** Sender MUST receive confirmation that request was sent

#### FR-002: Handshake Mechanism
- **FR-002.1:** Target player MUST receive notification within 500ms
- **FR-002.2:** Notification MUST show sender name and share type
- **FR-002.3:** Target player MUST be able to Accept or Decline
- **FR-002.4:** Request MUST timeout after 30 seconds if no response
- **FR-002.5:** System MUST notify sender of acceptance, decline, or timeout
- **FR-002.6:** Only accepted shares MUST reveal card information
- **FR-002.7:** Target player CAN have only one pending request at a time
- **FR-002.8:** New requests MUST queue if target is handling another

#### FR-003: Card Display
- **FR-003.1:** Accepted COLOR_ONLY shares MUST show only team color
- **FR-003.2:** Accepted FULL_CARD shares MUST show role name and team
- **FR-003.3:** Spy roles MUST show opposite team color in both share types
- **FR-003.4:** Spy FULL_CARD shares MUST indicate spy status
- **FR-003.5:** Card display MUST be visually distinct from own role card
- **FR-003.6:** Card display MUST persist until player dismisses it
- **FR-003.7:** Player CAN view multiple shared cards simultaneously

#### FR-004: Share History & Room Broadcasting
- **FR-004.1:** System MUST record all share requests (accepted/declined/timeout)
- **FR-004.2:** History MUST include: timestamp, sender, receiver, type, response
- **FR-004.3:** History MUST NOT reveal actual role information (only that share occurred)
- **FR-004.4:** Players MUST be able to view their share history during game
- **FR-004.5:** Complete history MUST be available in game results
- **FR-004.6:** Host MUST be able to view all share activity (post-game)
- **FR-004.7:** When a share is accepted, all players in the SAME ROOM as sender and receiver MUST be notified
- **FR-004.8:** Room broadcast MUST show: "[Sender] shared their card with [Receiver]" with share type
- **FR-004.9:** Room broadcast MUST NOT reveal the actual card information
- **FR-004.10:** Room broadcast MUST be visible in room activity feed
- **FR-004.11:** Players in different rooms MUST NOT see the share notification
- **FR-004.12:** Room broadcast helps players track information flow and build trust networks

#### FR-005: Request Management
- **FR-005.1:** System MUST show confirmation modal before sending request
- **FR-005.2:** Confirmation MUST display target name and share type
- **FR-005.3:** Once sent, requests CANNOT be cancelled by sender
- **FR-005.4:** Player CAN have multiple outgoing requests simultaneously
- **FR-005.5:** System MUST handle disconnection during pending request
- **FR-005.6:** Requests MUST expire if sender disconnects
- **FR-005.7:** Requests MUST auto-cancel if target disconnects

#### FR-006: Role-Specific Share Restrictions
- **FR-006.1:** Negotiator role MUST be restricted to FULL_CARD shares only
- **FR-006.2:** System MUST disable COLOR_ONLY option for Negotiator players
- **FR-006.3:** Negotiator UI MUST NOT show COLOR_ONLY share type selector
- **FR-006.4:** System MUST validate share type matches role restrictions server-side
- **FR-006.5:** Share type selector MUST adapt based on player's role
- **FR-006.6:** Error message MUST display if restricted share type attempted
- **FR-006.7:** Future roles with share restrictions MUST be supported extensibly

### Non-Functional Requirements

#### NFR-001: Performance
- Share request delivery < 500ms
- Handshake response < 100ms
- Support 50 concurrent share requests per game
- Share history retrieval < 200ms

#### NFR-002: Reliability
- Zero information leaks (strict access control)
- Atomic handshake operations
- Graceful handling of disconnections
- Request state recovery after reconnection

#### NFR-003: Usability
- Clear visual distinction between pending/accepted/declined
- Mobile-friendly touch targets (≥44px)
- Intuitive card display animations
- Non-intrusive notifications

#### NFR-004: Security
- Validate all requests server-side
- Prevent unauthorized card viewing
- Sanitize all player inputs
- Rate limit share requests (max 20/minute per player)

#### NFR-005: Accessibility
- Screen reader support for share requests
- Keyboard navigation for accept/decline
- High contrast mode for card displays
- ARIA labels for all interactive elements

### Out of Scope (v1)

- ❌ Group sharing (one-to-many direct reveals)
- ❌ Timed card reveals (auto-hide after X seconds)
- ❌ Animated card flip effects
- ❌ Voice/video for card reveals
- ❌ Custom card designs
- ❌ Share analytics dashboard
- ❌ Replay of share sequence with animations

## User Stories

### Epic 1: Share Request Flow

**As a player**, I want to share my card with another player in my room, so I can build trust and coordinate strategy.

**Acceptance Criteria:**
- Click on another player's name/card in my room
- "Share Card" button appears (only for same-room players)
- Players in different room do NOT have "Share Card" button
- Select share type: "Color Only" or "Full Card"
- Click "Send" to proceed to confirmation
- Confirmation modal shows: "Share [Type] with [Player Name]?"
- Warning: "This cannot be cancelled once sent!"
- Click "Yes, Send" to submit request (or "Go Back" to cancel)
- See "Request Sent to [Player]" notification
- Cannot cancel request after confirmation
- See pending indicator next to player name

---

**As a player receiving a share request**, I want to see who wants to share with me, so I can decide whether to accept.

**Acceptance Criteria:**
- Notification appears: "[Player] wants to share their card"
- Shows share type: "Color Only" or "Full Card"
- "Accept" and "Decline" buttons clearly visible
- Countdown timer shows 30 seconds remaining
- Notification dismisses on timeout
- Can only see one request at a time (others queued)

---

**As a player**, I want to accept a share request, so I can see the other player's card information.

**Acceptance Criteria:**
- Click "Accept" button
- Card display modal appears immediately
- Shows correct information based on share type
- Color-only shows team color badge
- Full card shows role name and team
- Modal has "Close" button
- Card stays visible until closed
- Sender receives "Accepted" notification

---

**As a player**, I want to decline a share request, so I can avoid receiving information I don't want.

**Acceptance Criteria:**
- Click "Decline" button
- Notification dismisses immediately
- Sender receives "Declined" notification
- No card information revealed
- Next queued request appears (if any)

### Epic 2: Card Display

**As a player viewing a color-only share**, I want to see the team color clearly, so I can quickly identify allegiance.

**Acceptance Criteria:**
- Large color badge (Red, Blue, or Grey)
- Player name shown
- "Team Color: RED TEAM", "BLUE TEAM", or "GREY TEAM"
- Share type indicator: "Color Only"
- Timestamp of share
- "Close" button

---

**As a player viewing a full card share**, I want to see complete role information, so I can understand the player's exact role.

**Acceptance Criteria:**
- Role name prominently displayed (e.g., "Red Operative")
- Team color badge
- Role type indicator (Leader/Spy/Operative)
- "This player is a SPY" warning if applicable
- Player name shown
- Timestamp of share
- "Close" button

---

**As a spy**, I want my color shares to show the opposite team, so I can deceive other players.

**Acceptance Criteria:**
- Red Spy color share shows "BLUE TEAM"
- Blue Spy color share shows "RED TEAM"
- Full card share still shows opposite color
- Full card share includes "SPY" indicator
- Deception works consistently for all share types

### Epic 3: Share History

**As a player**, I want to see my share history, so I can track who I've shared with and who shared with me.

**Acceptance Criteria:**
- "Share History" button in game UI
- Panel shows list of all shares (sent/received)
- Each entry shows: timestamp, player name, share type, status
- Color-coded: green (accepted), red (declined), gray (timeout)
- Filtered views: "Sent", "Received", "All"
- Scrollable list if many entries

---

**As a player**, I want to view all share activity after the game ends, so I can review what happened and analyze strategies.

**Acceptance Criteria:**
- All players can access full share history once game is finished
- Post-game results include "Share Activity" tab
- Shows complete timeline of all shares from all players
- Each entry shows: timestamp, sender name, receiver name, share type, status
- Filter options: by player, by share type, by status, by round
- Export functionality as JSON or CSV
- Visual graph/network diagram showing who shared with whom
- During active game: players only see their own share history
- After game ends: all share data becomes visible to everyone

---

**As a player in a room**, I want to see when other players in my room share cards with each other, so I can track information flow and trust networks.

**Acceptance Criteria:**
- When two players in my room complete a card share, I see a notification
- Notification shows: "[Alice] shared their card with [Bob] (Color Only)"
- Notification appears in room activity feed
- Does NOT show the actual card information
- Players in other rooms do NOT see this notification
- Activity feed shows timestamp
- Activity feed is scrollable and persistent during the round
- Helps identify who trusts whom without revealing actual roles

### Epic 4: Edge Cases

**As a player reconnecting**, I want to see any pending share requests, so I don't miss opportunities.

**Acceptance Criteria:**
- Upon reconnection, pending requests reappear
- Countdown timer resumes from remaining time
- If expired during disconnect, shows "Missed request from [Player]"
- Can still accept if time remains

---

**As a player**, I want multiple incoming requests to be handled automatically, so I'm not overwhelmed by simultaneous requests.

**Acceptance Criteria:**
- Only one share request can be active per player at a time
- When a player already has a pending request, any new incoming requests are auto-declined by the server
- Sender receives immediate "DECLINED" notification with reason: "Player is already reviewing another request"
- No queue management needed - one request at a time policy
- After responding to current request (accept/decline/timeout), player can receive new requests
- Player never sees multiple simultaneous request dialogs

### Epic 5: Role-Specific Restrictions

**As a Negotiator**, I want the system to enforce my role restriction of full card shares only, so I follow the game rules correctly.

**Acceptance Criteria:**
- Share type selector does NOT show "Color Only" option
- Only "Full Card" option is available and pre-selected
- Attempting to send color share (via API) returns error
- UI shows tooltip: "Negotiator: Can only share full cards"
- Share history correctly shows all shares as "Full Card"
- Other players can still choose either share type when sharing with me

---

**As a game designer**, I want to support extensible role-based share restrictions, so future roles with sharing limits can be easily added.

**Acceptance Criteria:**
- Role metadata includes `shareRestrictions` field
- Backend validates share type against role restrictions
- Frontend adapts UI based on role restrictions
- Error messages are role-specific and helpful
- System supports multiple restriction types:
  - `FULL_CARD_ONLY` (Negotiator)
  - `COLOR_ONLY` (potential future roles)
  - `NO_SHARING` (potential future roles like Shy Guy)
  - `LIMITED_COUNT` (potential future roles like Paranoid)

## Game Flow

### High-Level Flow

```
Player Initiates Share
    ↓
Select Target Player
    ↓
Choose Share Type (COLOR_ONLY / FULL_CARD)
    ↓
Send Request (WebSocket)
    ↓
┌──────────────────────────────────┐
│ Target Player                    │
│   - Receives Notification        │
│   - 30-second Countdown          │
│   - Accept / Decline / Timeout   │
└──────────────────────────────────┘
    ↓
Response Sent to Server
    ↓
┌──────────────────────────────────┐
│ If ACCEPTED                      │
│   - Card Info Sent to Target    │
│   - Display Card Modal           │
│   - Update Share History         │
│   - Notify Sender "Accepted"     │
│   - Broadcast to Same Room:      │
│     "[Sender] shared with        │
│      [Target] (type)"            │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│ If DECLINED                      │
│   - Notify Sender "Declined"     │
│   - Update Share History         │
│   - No Card Info Revealed        │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│ If TIMEOUT                       │
│   - Auto-decline                 │
│   - Notify Sender "Timeout"      │
│   - Update Share History         │
└──────────────────────────────────┘
```

### Detailed Request Flow

```
[1] Player A: Initiate Share
    ├─ Click on Player B's card
    ├─ Click "Share Card" button
    ├─ Select share type
    ├─ Click "Send Request"
    └─ WS: SHARE_REQUEST
        └─ Payload: { targetPlayerID, shareType }
    ↓
[2] Server: Validate Request
    ├─ Check Player A is in active game
    ├─ Check Player B exists and is online
    ├─ Check Player A rate limit (< 20/min)
    ├─ Generate requestID
    ├─ Store request state
    └─ Route request to Player B
    ↓
[3] Server → Player B: SHARE_REQUEST_RECEIVED
    ├─ Payload: { requestID, senderID, senderName, shareType }
    ├─ Start 30-second timeout timer
    └─ Check if Player B has pending request
        ├─ If yes: Add to queue
        └─ If no: Show notification immediately
    ↓
[4] Player B: Respond to Request
    ├─ Option A: Click "Accept"
    │   ├─ WS: SHARE_REQUEST_RESPONSE
    │   │   └─ Payload: { requestID, response: "ACCEPTED" }
    │   └─ [Go to step 5A]
    ├─ Option B: Click "Decline"
    │   ├─ WS: SHARE_REQUEST_RESPONSE
    │   │   └─ Payload: { requestID, response: "DECLINED" }
    │   └─ [Go to step 5B]
    └─ Option C: 30s Timeout
        ├─ Server auto-response: "TIMEOUT"
        └─ [Go to step 5C]
    ↓
[5A] Server: Handle ACCEPTED
    ├─ Get Player A's role
    ├─ Apply spy deception if needed
    ├─ Build card data (based on shareType)
    ├─ Send to Player B: SHARE_ACCEPTED
    │   └─ Payload: { requestID, cardData }
    ├─ Send to Player A: SHARE_RESPONSE_NOTIFICATION
    │   └─ Payload: { requestID, response: "ACCEPTED" }
    ├─ Determine if A and B are in same room
    ├─ Broadcast to Same Room Players: ROOM_SHARE_NOTIFICATION
    │   └─ Payload: { senderName, targetName, shareType }
    │   └─ Only sent to players in same room as A and B
    ├─ Record in share history
    └─ Update request state: "COMPLETED"
    ↓
[5B] Server: Handle DECLINED
    ├─ Send to Player A: SHARE_RESPONSE_NOTIFICATION
    │   └─ Payload: { requestID, response: "DECLINED" }
    ├─ Record in share history
    └─ Update request state: "COMPLETED"
    ↓
[5C] Server: Handle TIMEOUT
    ├─ Send to Player A: SHARE_RESPONSE_NOTIFICATION
    │   └─ Payload: { requestID, response: "TIMEOUT" }
    ├─ Send to Player B: REQUEST_EXPIRED (dismiss notification)
    ├─ Record in share history
    └─ Update request state: "TIMEOUT"
    ↓
[6] Client: Update UI
    ├─ Player A: Show notification (accepted/declined/timeout)
    ├─ Player B: Show card modal (if accepted)
    ├─ Update share history panels
    └─ Update player list indicators
```

### Spy Deception Logic

**Key Principle:** Full card shares CANNOT hide role information. The role name is always revealed truthfully, including "Spy". Only the team color can be deceived.

```
If Player.Role = "Red Spy":
    COLOR_ONLY share:
        Display: "BLUE TEAM" (opposite team color - deception works)
        Role name: NOT shown (color only)

    FULL_CARD share:
        Display: "Red Spy" + "BLUE TEAM" color + "⚠️ This player is a SPY"
        Role name: "Red Spy" (ALWAYS shows actual spy role, CANNOT be hidden)
        Team color: "BLUE TEAM" (opposite - deception)
        Note: Receiver sees the spy role name but wrong team affiliation

If Player.Role = "Blue Spy":
    COLOR_ONLY share:
        Display: "RED TEAM" (opposite team color - deception works)
        Role name: NOT shown (color only)

    FULL_CARD share:
        Display: "Blue Spy" + "RED TEAM" color + "⚠️ This player is a SPY"
        Role name: "Blue Spy" (ALWAYS shows actual spy role, CANNOT be hidden)
        Team color: "RED TEAM" (opposite - deception)
        Note: Receiver sees the spy role name but wrong team affiliation

If Player.Team = "Grey Team":
    COLOR_ONLY share:
        Display: "GREY TEAM" (no deception for Grey team)
    FULL_CARD share:
        Display: Actual role name + "GREY TEAM"
        No deception applied
    Note: Grey team members have independent win conditions

If Player.Role = any other role (Red/Blue non-spy):
    COLOR_ONLY share:
        Display: Actual team color (RED/BLUE)
    FULL_CARD share:
        Display: Actual role name + actual team color
        No deception applied
```

**Important:** Spies cannot avoid revealing their spy status in full card shares. The "Spy" role name is always shown. The only deception is showing the opposite team color.

### State Machine

```
┌─────────────────┐
│   IDLE          │  No active share requests
└────────┬────────┘
         │ Player clicks "Share Card"
         ↓
┌─────────────────┐
│  REQUEST_SENT   │  Waiting for target response
└────────┬────────┘
         │
         ├─────────────┬─────────────┬─────────────┐
         │ Accept      │ Decline     │ Timeout     │
         ↓             ↓             ↓
┌─────────────────┐ ┌─────────────┐ ┌─────────────┐
│  ACCEPTED       │ │  DECLINED   │ │  TIMEOUT    │
│  (Show Card)    │ │  (Notify)   │ │  (Notify)   │
└─────────────────┘ └─────────────┘ └─────────────┘
         │             │             │
         └─────────────┴─────────────┘
                       ↓
                ┌─────────────────┐
                │   COMPLETED     │
                └─────────────────┘
```

## Technical Design

### Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  ShareButton   │  │ShareRequest  │  │ CardDisplay │ │
│  │  - Initiate    │  │Notification  │  │ - Color     │ │
│  │  - Type select │  │- Accept/Deny │  │ - Full Card │ │
│  └────────────────┘  └──────────────┘  └─────────────┘ │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ ShareHistory   │  │RequestQueue  │  │PlayerList   │ │
│  │ - Timeline     │  │- Pending     │  │ - Indicators│ │
│  │ - Filter       │  │- Cancel      │  │ - Status    │ │
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
│  │  - Route share events                              │ │
│  │  - Broadcast to specific players                   │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              ShareService                          │ │
│  │  - Create requests                                 │ │
│  │  - Handle responses                                │ │
│  │  - Apply spy deception                             │ │
│  │  - Manage timeouts                                 │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              ShareHistoryService                   │ │
│  │  - Record all shares                               │ │
│  │  - Query history                                   │ │
│  │  - Generate reports                                │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                            │
                            │
┌──────────────────────────────────────────────────────────┐
│                     Data Layer                           │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐ │
│  │              In-Memory Store                       │ │
│  │  - Pending requests                                │ │
│  │  - Request queue per player                        │ │
│  │  - Share history records                           │ │
│  │  - Request timeouts                                │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Component Breakdown

> **Note:** Detailed component breakdown has been moved to [`component-breakdown.md`](./component-breakdown.md) to reduce file size and improve readability.

The component breakdown includes:
- Backend components (ShareService, ShareHistoryService, RequestQueueManager)
- Frontend components (ShareButton, ShareRequestNotification, CardDisplay, ShareHistory, RequestQueue, RoomActivityFeed)
- Complete data flow diagrams for all share scenarios

## UI/UX Design

> **Note:** Detailed UI/UX design specifications with full mockups have been moved to [`ui-ux-design.md`](./ui-ux-design.md) to reduce file size and improve readability.

The UI/UX design document includes complete mockups and specifications for:
- Share button design
- Share type selector modals (normal player and Negotiator)
- Confirmation modal
- Share request notifications
- Card displays (color only, full card, spy deception)
- Share history panel
- Outgoing requests widget
- Room activity feed

**Key UI Principles:**
- Spy deception: Full card shares show actual spy role name but opposite team color badge
- No "Team:" label for spies to avoid contradiction (e.g., "Red Spy on Blue Team")
- Confirmation modal required before sending any request
- One-at-a-time request notifications (auto-decline if target already has pending request)
- Same-room restriction: Share button only visible for players in same room


## API Specifications

> **Note:** Complete API specifications have been moved to [`api-specs.md`](./api-specs.md) for easier reference and maintenance.

The API specifications document includes:
- REST endpoints for share history
- WebSocket events for real-time communication (8 event types)
- Request/response payload structures
- Validation rules
- Room broadcasting logic


## Data Models

> **Note:** Complete data models have been moved to [`data-models.md`](./data-models.md) for better organization and type reference.

The data models document includes:
- Backend Go models (ShareRequest, CardData, ShareRecord, RoleShareRestriction)
- Frontend TypeScript types (all interfaces and type definitions)
- Enum definitions for share types, statuses, and restrictions


## Security & Validation

### Server-Side Validation

#### Share Request Validation

```go
func (ss *ShareService) ValidateShareRequest(
    sessionID, senderID, targetID string,
    shareType ShareType,
) error {
    // 1. Verify sender exists and is in game
    sender := ss.store.GetPlayer(sessionID, senderID)
    if sender == nil {
        return errors.New("sender not found")
    }
    if !sender.IsConnected {
        return errors.New("sender is not connected")
    }

    // 2. Verify target exists and is in game
    target := ss.store.GetPlayer(sessionID, targetID)
    if target == nil {
        return errors.New("target player not found")
    }
    if !target.IsConnected {
        return errors.New("target player is not connected")
    }

    // 3. Verify sender is not targeting themselves
    if senderID == targetID {
        return errors.New("cannot share with yourself")
    }

    // 4. Verify both players are in the same room
    if sender.CurrentRoom != target.CurrentRoom {
        return errors.New("can only share with players in the same room")
    }

    // 5. Verify share type is valid
    if shareType != ShareTypeColorOnly && shareType != ShareTypeFullCard {
        return errors.New("invalid share type")
    }

    // 6. Check role-specific share restrictions
    if err := ss.ValidateRoleRestrictions(sender, shareType); err != nil {
        return err
    }

    // 7. Check rate limit (max 20 requests per minute)
    if ss.isRateLimited(senderID) {
        return errors.New("rate limit exceeded")
    }

    return nil
}

func (ss *ShareService) ValidateRoleRestrictions(
    player *models.Player,
    shareType ShareType,
) error {
    // Get role restrictions
    restriction := ss.GetRoleShareRestriction(player.Role.Name)

    if restriction.Type == ShareRestrictionNoSharing {
        return errors.New("your role cannot share cards")
    }

    // Check if share type is allowed
    allowed := false
    for _, allowedType := range restriction.AllowedTypes {
        if allowedType == shareType {
            allowed = true
            break
        }
    }

    if !allowed {
        if restriction.Type == ShareRestrictionFullCardOnly {
            return errors.New("negotiator can only share full cards")
        }
        return errors.New("share type not allowed for your role")
    }

    // Check share count limits (for Paranoid, etc.)
    if restriction.MaxSharesPerGame != nil {
        shareCount := ss.GetPlayerShareCount(player.ID)
        if shareCount >= *restriction.MaxSharesPerGame {
            return fmt.Errorf("maximum shares per game exceeded (%d/%d)",
                shareCount, *restriction.MaxSharesPerGame)
        }
    }

    return nil
}

func (ss *ShareService) GetRoleShareRestriction(roleName string) RoleShareRestriction {
    // Define restrictions per role
    restrictions := map[string]RoleShareRestriction{
        "Negotiator": {
            Type:         ShareRestrictionFullCardOnly,
            AllowedTypes: []ShareType{ShareTypeFullCard},
        },
        "Shy Guy": {
            Type:         ShareRestrictionNoSharing,
            AllowedTypes: []ShareType{},
        },
        "Coy Boy": {
            Type:         ShareRestrictionColorOnly,
            AllowedTypes: []ShareType{ShareTypeColorOnly},
        },
        "Paranoid": {
            Type:              ShareRestrictionLimitedCount,
            AllowedTypes:      []ShareType{ShareTypeFullCard},
            MaxSharesPerGame:  intPtr(1),
        },
    }

    if restriction, exists := restrictions[roleName]; exists {
        return restriction
    }

    // Default: no restrictions
    return RoleShareRestriction{
        Type:         ShareRestrictionNone,
        AllowedTypes: []ShareType{ShareTypeColorOnly, ShareTypeFullCard},
    }
}
```

#### Response Validation

```go
func (ss *ShareService) ValidateResponse(
    requestID, responderID string,
    response ShareRequestStatus,
) error {
    // 1. Verify request exists
    request := ss.store.GetShareRequest(requestID)
    if request == nil {
        return errors.New("request not found")
    }

    // 2. Verify responder is the target
    if request.TargetID != responderID {
        return errors.New("only target can respond")
    }

    // 3. Verify request is still pending
    if request.Status != ShareStatusPending {
        return errors.New("request is not pending")
    }

    // 4. Verify request has not expired
    if time.Now().After(request.ExpiresAt) {
        return errors.New("request has expired")
    }

    // 5. Verify response is valid
    if response != ShareStatusAccepted && response != ShareStatusDeclined {
        return errors.New("invalid response")
    }

    return nil
}
```

#### Spy Deception Logic

```go
func (ss *ShareService) ApplySpyDeception(
    player *models.Player,
    shareType ShareType,
) *CardData {
    cardData := &CardData{
        TeamColor: player.Team.Color,
        TeamName:  player.Team.Name,
        IsSpy:     player.Role.IsSpy,
    }

    // Apply deception for spies
    if player.Role.IsSpy {
        // Show opposite team color
        if player.Team.Color == models.RedRoom {
            cardData.TeamColor = models.BlueRoom
            cardData.TeamName = "Blue Team"
        } else {
            cardData.TeamColor = models.RedRoom
            cardData.TeamName = "Red Team"
        }
    }

    // Include role name only for FULL_CARD shares
    if shareType == ShareTypeFullCard {
        roleName := player.Role.Name
        if player.Role.IsSpy {
            // Show spy role with opposite color
            if player.Team.Color == models.RedRoom {
                roleName = "Blue Spy"
            } else {
                roleName = "Red Spy"
            }
        }
        cardData.RoleName = &roleName
    }

    return cardData
}
```

### Rate Limiting

```go
type RateLimiter struct {
    requests map[string][]time.Time  // playerID -> timestamps
    mu       sync.RWMutex
}

func (rl *RateLimiter) IsRateLimited(playerID string) bool {
    rl.mu.RLock()
    defer rl.mu.RUnlock()

    now := time.Now()
    oneMinuteAgo := now.Add(-1 * time.Minute)

    // Clean old timestamps
    timestamps := rl.requests[playerID]
    var recent []time.Time
    for _, ts := range timestamps {
        if ts.After(oneMinuteAgo) {
            recent = append(recent, ts)
        }
    }
    rl.requests[playerID] = recent

    // Check if exceeded limit (20 per minute)
    return len(recent) >= 20
}

func (rl *RateLimiter) RecordRequest(playerID string) {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    rl.requests[playerID] = append(rl.requests[playerID], time.Now())
}
```

### Authorization

- Only the sender can cancel their own request
- Only the target can respond to a request
- Only authenticated players can view share history
- Card data only sent to target who accepted

## Testing Strategy

> **Note:** Complete testing strategy with all test cases has been moved to [`testing-strategy.md`](./testing-strategy.md).

The testing strategy document includes:
- Unit tests (Backend: ShareService, RequestQueueManager, ShareHistoryService | Frontend: All components)
- Integration tests (8 scenarios including spy deception and role restrictions)
- E2E tests (Playwright test examples)
- Performance test requirements


## Deployment Plan

### Phase 1: Backend Foundation (Days 1-3)

**Tasks:**
1. Create share_service.go
2. Create share_history_service.go
3. Create request_queue.go
4. Add WebSocket event handlers
5. Implement spy deception logic
6. Write unit tests (90% coverage)
7. Write integration tests

**Deliverables:**
- ✅ Share request API
- ✅ Handshake mechanism
- ✅ Spy deception logic
- ✅ Share history recording
- ✅ Request queue management
- ✅ Rate limiting

### Phase 2: Frontend Components (Days 4-6)

**Tasks:**
1. Create ShareButton component
2. Create ShareRequestNotification component
3. Create CardDisplay component
4. Create ShareHistory component
5. Create RequestQueue component
6. Integrate with WebSocket
7. Write component tests
8. Mobile responsive design

**Deliverables:**
- ✅ All UI components
- ✅ WebSocket integration
- ✅ Mobile-friendly design
- ✅ Animations and transitions

### Phase 3: Integration & Testing (Days 7-9)

**Tasks:**
1. End-to-end testing
2. Performance testing
3. Bug fixes
4. UI polish
5. Accessibility audit
6. Documentation

**Deliverables:**
- ✅ E2E test suite
- ✅ Performance benchmarks met
- ✅ Zero critical bugs
- ✅ WCAG 2.1 AA compliant

### Phase 4: Deployment (Day 10)

**Tasks:**
1. Deploy to staging
2. Smoke tests
3. Deploy to production
4. Monitor metrics

**Deliverables:**
- ✅ Production deployment
- ✅ Monitoring dashboards
- ✅ Rollback plan

## Success Criteria

### Launch Criteria

- ✅ All unit tests passing (90%+ coverage)
- ✅ All integration tests passing
- ✅ E2E tests passing for critical flows
- ✅ Performance benchmarks met
- ✅ Security review completed
- ✅ Spy deception tested and verified
- ✅ Zero critical bugs

### Post-Launch Metrics (Week 1)

- ✅ 95%+ share request success rate
- ✅ <5% timeout rate
- ✅ <100ms WebSocket latency
- ✅ Zero information leaks
- ✅ Zero data corruption

### Long-Term Success (Month 1)

- ✅ 80%+ of players use card sharing feature
- ✅ Average 5+ shares per game
- ✅ 90%+ player satisfaction
- ✅ Feature adoption rate >70%

---

**Document Version:** 1.0
**Author:** Claude (AI Assistant)
**Review Status:** Draft
**Last Updated:** 2025-11-10
**Next Review:** After stakeholder feedback
