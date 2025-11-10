# Data Models - Online Card Share Feature

## Backend Models

### ShareRequest

**File:** `backend/internal/models/share_request.go`

```go
type ShareType string

const (
    ShareTypeColorOnly ShareType = "COLOR_ONLY"
    ShareTypeFullCard  ShareType = "FULL_CARD"
)

type ShareRequestStatus string

const (
    ShareStatusPending   ShareRequestStatus = "PENDING"
    ShareStatusAccepted  ShareRequestStatus = "ACCEPTED"
    ShareStatusDeclined  ShareRequestStatus = "DECLINED"
    ShareStatusTimeout   ShareRequestStatus = "TIMEOUT"
    ShareStatusCancelled ShareRequestStatus = "CANCELLED"
)

type ShareRequest struct {
    ID              string             `json:"id"`
    GameSessionID   string             `json:"gameSessionId"`
    SenderID        string             `json:"senderId"`
    SenderName      string             `json:"senderName"`
    TargetID        string             `json:"targetId"`
    TargetName      string             `json:"targetName"`
    ShareType       ShareType          `json:"shareType"`
    Status          ShareRequestStatus `json:"status"`
    CreatedAt       time.Time          `json:"createdAt"`
    RespondedAt     *time.Time         `json:"respondedAt,omitempty"`
    ExpiresAt       time.Time          `json:"expiresAt"`
}
```

### CardData

**File:** `backend/internal/models/card_data.go`

```go
type CardData struct {
    TeamColor   RoomColor `json:"teamColor"`    // RED, BLUE, or GREY (with deception for spies)
    TeamName    string    `json:"teamName"`     // "Red Team", "Blue Team", or "Grey Team"
    RoleName    *string   `json:"roleName"`     // Full role name (null for COLOR_ONLY)
    IsSpy       bool      `json:"isSpy"`        // True if player is a spy
}
```

### ShareRecord

**File:** `backend/internal/models/share_record.go`

```go
type ShareRecord struct {
    ID              string             `json:"id"`
    GameSessionID   string             `json:"gameSessionId"`
    SenderID        string             `json:"senderId"`
    SenderName      string             `json:"senderName"`
    TargetID        string             `json:"targetId"`
    TargetName      string             `json:"targetName"`
    ShareType       ShareType          `json:"shareType"`
    Status          ShareRequestStatus `json:"status"`
    Timestamp       time.Time          `json:"timestamp"`
    RoundNumber     int                `json:"roundNumber"`
}
```

### RoleShareRestriction

**File:** `backend/internal/models/role_restriction.go`

```go
type ShareRestrictionType string

const (
    ShareRestrictionNone          ShareRestrictionType = "NONE"
    ShareRestrictionFullCardOnly  ShareRestrictionType = "FULL_CARD_ONLY"  // Negotiator
    ShareRestrictionColorOnly     ShareRestrictionType = "COLOR_ONLY"       // Future roles
    ShareRestrictionNoSharing     ShareRestrictionType = "NO_SHARING"       // Shy Guy
    ShareRestrictionLimitedCount  ShareRestrictionType = "LIMITED_COUNT"    // Paranoid
)

type RoleShareRestriction struct {
    Type              ShareRestrictionType `json:"type"`
    AllowedTypes      []ShareType          `json:"allowedTypes"`      // Allowed share types
    MaxSharesPerGame  *int                 `json:"maxSharesPerGame"`  // For LIMITED_COUNT
    MaxSharesPerRound *int                 `json:"maxSharesPerRound"` // For future restrictions
}
```

## Frontend Types

**File:** `frontend/src/types/share.types.ts`

```typescript
export type ShareType = 'COLOR_ONLY' | 'FULL_CARD';

export type ShareRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'TIMEOUT'
  | 'CANCELLED';

export type ShareRestrictionType =
  | 'NONE'
  | 'FULL_CARD_ONLY'
  | 'COLOR_ONLY'
  | 'NO_SHARING'
  | 'LIMITED_COUNT';

export interface RoleShareRestriction {
  type: ShareRestrictionType;
  allowedTypes: ShareType[];
  maxSharesPerGame?: number;
  maxSharesPerRound?: number;
}

export interface ShareRequest {
  id: string;
  gameSessionId: string;
  senderId: string;
  senderName: string;
  targetId: string;
  targetName: string;
  shareType: ShareType;
  status: ShareRequestStatus;
  createdAt: string;
  respondedAt?: string;
  expiresAt: string;
}

export interface CardData {
  teamColor: 'RED' | 'BLUE' | 'GREY';
  teamName: string;
  roleName?: string;
  isSpy: boolean;
}

export interface ShareRecord {
  id: string;
  gameSessionId: string;
  senderId: string;
  senderName: string;
  targetId: string;
  targetName: string;
  shareType: ShareType;
  status: ShareRequestStatus;
  timestamp: string;
  roundNumber: number;
}

export interface SharedCard {
  requestId: string;
  senderName: string;
  cardData: CardData;
  shareType: ShareType;
  timestamp: string;
}
```
