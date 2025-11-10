# API Specifications - Online Card Share Feature

## REST Endpoints

### 1. Get Share History

**Endpoint:** `GET /api/v1/rooms/:roomCode/shares/history`

**Query Parameters:**
- `playerID` (optional): Filter by player
- `type` (optional): Filter by share type (COLOR_ONLY, FULL_CARD)
- `status` (optional): Filter by status (ACCEPTED, DECLINED, TIMEOUT)

**Response:** 200 OK
```json
{
  "history": [
    {
      "id": "share-uuid-1",
      "senderID": "player-uuid-1",
      "senderName": "Alice",
      "targetID": "player-uuid-2",
      "targetName": "Bob",
      "shareType": "COLOR_ONLY",
      "status": "ACCEPTED",
      "timestamp": "2025-11-10T12:45:00Z"
    }
  ]
}
```

## WebSocket Events

### 1. SHARE_REQUEST

**Direction:** Client → Server

**Payload:**
```json
{
  "type": "SHARE_REQUEST",
  "payload": {
    "targetPlayerID": "player-uuid-2",
    "shareType": "COLOR_ONLY"
  }
}
```

**Validation:**
- Sender exists and is in game
- Target exists and is online
- Share type is valid (COLOR_ONLY or FULL_CARD)
- Rate limit not exceeded

---

### 2. SHARE_REQUEST_RECEIVED

**Direction:** Server → Client (Target player only)

**Payload:**
```json
{
  "type": "SHARE_REQUEST_RECEIVED",
  "payload": {
    "requestID": "req-uuid-123",
    "senderID": "player-uuid-1",
    "senderName": "Alice",
    "shareType": "COLOR_ONLY",
    "timeoutSeconds": 30,
    "queueLength": 2
  }
}
```

---

### 3. SHARE_REQUEST_SENT

**Direction:** Server → Client (Sender only)

**Payload:**
```json
{
  "type": "SHARE_REQUEST_SENT",
  "payload": {
    "requestID": "req-uuid-123",
    "targetPlayerID": "player-uuid-2",
    "targetPlayerName": "Bob",
    "status": "PENDING"
  }
}
```

---

### 4. SHARE_REQUEST_RESPONSE

**Direction:** Client → Server (Target player)

**Payload:**
```json
{
  "type": "SHARE_REQUEST_RESPONSE",
  "payload": {
    "requestID": "req-uuid-123",
    "response": "ACCEPTED"
  }
}
```

**Response Options:**
- `ACCEPTED`: Target accepts the share
- `DECLINED`: Target declines the share

**Validation:**
- Request ID is valid
- Request is still pending (not expired)
- Sender is the target player of the request

---

### 5. SHARE_ACCEPTED

**Direction:** Server → Client (Target player only)

**Payload:**
```json
{
  "type": "SHARE_ACCEPTED",
  "payload": {
    "requestID": "req-uuid-123",
    "senderID": "player-uuid-1",
    "senderName": "Alice",
    "shareType": "COLOR_ONLY",
    "cardData": {
      "teamColor": "BLUE",
      "teamName": "Blue Team",
      "roleName": null,
      "isSpy": false
    },
    "timestamp": "2025-11-10T12:45:30Z"
  }
}
```

**Card Data Fields:**
- `teamColor`: "RED" or "BLUE" (with spy deception applied)
- `teamName`: "Red Team" or "Blue Team"
- `roleName`: Full role name (only for FULL_CARD type)
- `isSpy`: Boolean (only for FULL_CARD type)

---

### 6. SHARE_RESPONSE_NOTIFICATION

**Direction:** Server → Client (Sender only)

**Payload:**
```json
{
  "type": "SHARE_RESPONSE_NOTIFICATION",
  "payload": {
    "requestID": "req-uuid-123",
    "targetPlayerID": "player-uuid-2",
    "targetPlayerName": "Bob",
    "response": "ACCEPTED",
    "timestamp": "2025-11-10T12:45:30Z"
  }
}
```

**Response Types:**
- `ACCEPTED`: Target accepted
- `DECLINED`: Target declined
- `TIMEOUT`: Request timed out

**Note:** `CANCELLED` response type removed - requests cannot be cancelled after sending

---

### 7. REQUEST_EXPIRED

**Direction:** Server → Client (Target player only)

**Payload:**
```json
{
  "type": "REQUEST_EXPIRED",
  "payload": {
    "requestID": "req-uuid-123"
  }
}
```

**Purpose:** Dismiss the notification UI and show next queued request

---

### 8. ROOM_SHARE_NOTIFICATION

**Direction:** Server → Client (Room members only)

**Payload:**
```json
{
  "type": "ROOM_SHARE_NOTIFICATION",
  "payload": {
    "senderID": "player-uuid-1",
    "senderName": "Alice",
    "targetID": "player-uuid-2",
    "targetName": "Bob",
    "shareType": "COLOR_ONLY",
    "timestamp": "2025-11-10T12:45:30Z"
  }
}
```

**Purpose:**
- Notify room members that a share occurred
- Only sent to players in the same room as both sender and target
- Does NOT include actual card information
- Helps players track information flow and trust networks

**Broadcast Logic:**
```
If (sender.currentRoom == target.currentRoom):
    Broadcast to all players in that room (excluding sender and target)
Else:
    No room broadcast (players in different rooms)
```
