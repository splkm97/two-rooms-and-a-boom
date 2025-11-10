# Component Breakdown - Online Card Share Feature

## Backend Components

### 1. ShareService (`internal/services/share_service.go`)

**Responsibilities:**
- Create and validate share requests
- Route requests to target players
- Handle request responses (accept/decline)
- Apply spy deception logic
- Manage request timeouts
- Cancel requests

**Key Methods:**
```go
type ShareService struct {
    hub     *websocket.Hub
    store   *store.MemoryStore
    history *ShareHistoryService
    timers  map[string]*time.Timer  // requestID -> timeout timer
    mu      sync.RWMutex
}

func (ss *ShareService) CreateShareRequest(
    sessionID, senderID, targetID string,
    shareType ShareType,
) (*ShareRequest, error)

func (ss *ShareService) HandleResponse(
    requestID string,
    response ShareResponse,
) error

func (ss *ShareService) GetCardData(
    sessionID, playerID string,
    shareType ShareType,
) (*CardData, error)

func (ss *ShareService) ApplySpyDeception(
    player *models.Player,
    shareType ShareType,
) *CardData

func (ss *ShareService) HandleTimeout(requestID string) error

func (ss *ShareService) BroadcastToRoom(
    sessionID string,
    senderID, targetID string,
    shareType ShareType,
) error
```

### 2. ShareHistoryService (`internal/services/share_history_service.go`)

**Responsibilities:**
- Record all share activity
- Store request metadata
- Query share history
- Generate share reports
- Export history data

**Key Methods:**
```go
type ShareHistoryService struct {
    store *store.MemoryStore
}

func (shs *ShareHistoryService) RecordShare(record *ShareRecord) error
func (shs *ShareHistoryService) GetPlayerHistory(sessionID, playerID string) ([]*ShareRecord, error)
func (shs *ShareHistoryService) GetGameHistory(sessionID string) ([]*ShareRecord, error)
func (shs *ShareHistoryService) GetSharesBetween(sessionID, playerA, playerB string) ([]*ShareRecord, error)
func (shs *ShareHistoryService) ExportHistory(sessionID string, format string) ([]byte, error)
```

### 3. RequestQueueManager (`internal/services/request_queue.go`)

**Responsibilities:**
- Manage per-player request queues
- Ensure one active request per player
- Handle queue progression
- Clean up expired requests

**Key Methods:**
```go
type RequestQueueManager struct {
    queues map[string]*RequestQueue  // targetPlayerID -> queue
    mu     sync.RWMutex
}

func (rqm *RequestQueueManager) EnqueueRequest(targetID string, request *ShareRequest) error
func (rqm *RequestQueueManager) GetActiveRequest(targetID string) (*ShareRequest, error)
func (rqm *RequestQueueManager) CompleteActiveRequest(targetID string) (*ShareRequest, error)
func (rqm *RequestQueueManager) GetQueueLength(targetID string) int
func (rqm *RequestQueueManager) RemoveRequest(requestID string) error
```

## Frontend Components

### 1. ShareButton Component

**Location:** `frontend/src/components/game/ShareButton.tsx`

**Props:**
```typescript
interface ShareButtonProps {
  targetPlayer: Player;
  onShareRequest: (shareType: ShareType) => void;
  disabled?: boolean;
  alreadyShared?: boolean;
}
```

**Features:**
- Click to open share type selector
- Radio buttons: "Color Only" / "Full Card"
- "Send Request" button
- Disabled state for disconnected players
- Visual indicator if already shared

### 2. ShareRequestNotification Component

**Location:** `frontend/src/components/game/ShareRequestNotification.tsx`

**Props:**
```typescript
interface ShareRequestNotificationProps {
  request: ShareRequest;
  onAccept: () => void;
  onDecline: () => void;
  timeRemaining: number;
  queueLength: number;
}
```

**Features:**
- Modal dialog (non-dismissible)
- Shows sender name and avatar
- Shows share type badge
- Accept/Decline buttons (large touch targets)
- Countdown timer (30s)
- Queue indicator: "2 more requests waiting"

### 3. CardDisplay Component

**Location:** `frontend/src/components/game/CardDisplay.tsx`

**Props:**
```typescript
interface CardDisplayProps {
  cardData: CardData;
  shareType: ShareType;
  playerName: string;
  timestamp: Date;
  onClose: () => void;
}
```

**Features:**
- Modal or floating card
- Color-only view: Large color badge + team name
- Full card view: Role name + team + spy indicator
- Player name and share timestamp
- Close button (X)
- Responsive design (mobile/desktop)

### 4. ShareHistory Component

**Location:** `frontend/src/components/game/ShareHistory.tsx`

**Props:**
```typescript
interface ShareHistoryProps {
  history: ShareRecord[];
  currentPlayerId: string;
}
```

**Features:**
- Slide-out panel or modal
- Tabs: "Sent" / "Received" / "All"
- Timeline view with icons
- Color-coded status (green/red/gray)
- Filter by player name
- Scrollable list

### 5. RequestQueue Component

**Location:** `frontend/src/components/game/RequestQueue.tsx`

**Props:**
```typescript
interface RequestQueueProps {
  outgoingRequests: ShareRequest[];
  onCancel: (requestID: string) => void;
}
```

**Features:**
- Small widget showing pending outgoing requests
- List with player names
- Cancel button per request
- Status indicator (pending/accepted/declined)
- Collapsible/expandable

### 6. RoomActivityFeed Component

**Location:** `frontend/src/components/game/RoomActivityFeed.tsx`

**Props:**
```typescript
interface RoomActivityFeedProps {
  activities: RoomShareActivity[];
  isCollapsed?: boolean;
  onToggle?: () => void;
}

interface RoomShareActivity {
  id: string;
  senderName: string;
  targetName: string;
  shareType: ShareType;
  timestamp: Date;
}
```

**Features:**
- Scrollable activity feed
- Shows "[Sender] shared with [Target] (Type)"
- Auto-scrolls to latest activity
- Collapsible/expandable
- Mobile: Swipe up to expand
- Color-coded by share type
- Only shows same-room shares
- Helps track trust networks

## Data Flow

### 1. Share Request Flow

```
[Player A] Click "Share Card" on Player B
    ↓
[Frontend] Show share type selector modal
    ↓
[Player A] Select "Color Only" or "Full Card"
    ↓
[Player A] Click "Send" button
    ↓
[Frontend] Show confirmation modal
    └─ Display: "Share [Type] with [Player B]?"
    └─ Warning: "This cannot be cancelled once sent!"
    ↓
[Player A] Click "Yes, Send" (or "Go Back" to cancel)
    ↓
[Frontend] WS: SHARE_REQUEST
    └─ Payload: { targetPlayerID: "B", shareType: "COLOR_ONLY" }
    ↓
[Backend] ShareService.CreateShareRequest()
    ├─ Validate sender and target
    ├─ Check rate limit
    ├─ Generate requestID
    ├─ Check target's queue
    ├─ Enqueue request
    ├─ Start 30s timeout timer
    └─ Route to target
    ↓
[Backend] → Player B: SHARE_REQUEST_RECEIVED
    └─ Payload: { requestID, senderID, senderName, shareType, queueLength }
    ↓
[Frontend Player B] Show ShareRequestNotification
    ├─ If no active request: Show immediately
    └─ If active request: Show queue indicator
    ↓
[Backend] → Player A: SHARE_REQUEST_SENT
    └─ Payload: { requestID, status: "PENDING" }
    ↓
[Frontend Player A] Add to outgoing requests list
```

### 2. Accept Response Flow

```
[Player B] Click "Accept"
    ↓
[Frontend] WS: SHARE_REQUEST_RESPONSE
    └─ Payload: { requestID, response: "ACCEPTED" }
    ↓
[Backend] ShareService.HandleResponse()
    ├─ Validate requestID
    ├─ Get Player A's role
    ├─ Apply spy deception if needed
    ├─ Build CardData based on shareType
    ├─ Cancel timeout timer
    ├─ Record in history
    └─ Send responses
    ↓
[Backend] → Player B: SHARE_ACCEPTED
    └─ Payload: { requestID, cardData: { teamColor, roleName, isSpy } }
    ↓
[Backend] → Player A: SHARE_RESPONSE_NOTIFICATION
    └─ Payload: { requestID, response: "ACCEPTED", targetName: "Player B" }
    ↓
[Frontend Player B] Show CardDisplay modal with cardData
    ↓
[Frontend Player A] Show toast: "Player B accepted your share"
    ↓
[Both Frontends] Update share history
```

### 3. Decline Response Flow

```
[Player B] Click "Decline"
    ↓
[Frontend] WS: SHARE_REQUEST_RESPONSE
    └─ Payload: { requestID, response: "DECLINED" }
    ↓
[Backend] ShareService.HandleResponse()
    ├─ Validate requestID
    ├─ Cancel timeout timer
    ├─ Record in history
    └─ Send notifications
    ↓
[Backend] → Player A: SHARE_RESPONSE_NOTIFICATION
    └─ Payload: { requestID, response: "DECLINED", targetName: "Player B" }
    ↓
[Frontend Player A] Show toast: "Player B declined your share"
    ↓
[Frontend Player B] Dismiss notification, show next queued request
    ↓
[Both Frontends] Update share history
```

### 4. Timeout Flow

```
30 seconds elapsed with no response
    ↓
[Backend] Timer fires → ShareService.HandleTimeout()
    ├─ Auto-decline request
    ├─ Record in history
    └─ Send notifications
    ↓
[Backend] → Player B: REQUEST_EXPIRED
    └─ Dismiss notification, show next queued request
    ↓
[Backend] → Player A: SHARE_RESPONSE_NOTIFICATION
    └─ Payload: { requestID, response: "TIMEOUT", targetName: "Player B" }
    ↓
[Frontend Player A] Show toast: "Player B didn't respond (timeout)"
    ↓
[Both Frontends] Update share history (status: TIMEOUT)
```
