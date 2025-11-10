# Testing Strategy - Online Card Share Feature

## Unit Tests

### Backend

1. **ShareService Tests** (`share_service_test.go`)
   - ✅ Create request validates sender/target
   - ✅ Reject request to self
   - ✅ Reject request to player in different room
   - ✅ Reject request to offline player
   - ✅ Reject invalid share type
   - ✅ Negotiator can only send FULL_CARD shares
   - ✅ Negotiator COLOR_ONLY request rejected with error
   - ✅ Shy Guy cannot share at all (NO_SHARING)
   - ✅ Coy Boy can only send COLOR_ONLY shares
   - ✅ Paranoid share count limit enforced (max 1 per game)
   - ✅ Normal players can send both share types
   - ✅ Apply spy deception correctly (Red Spy shows Blue)
   - ✅ Apply spy deception correctly (Blue Spy shows Red)
   - ✅ Handle accept response correctly
   - ✅ Handle decline response correctly
   - ✅ Handle timeout correctly
   - ✅ Rate limit enforced (>20/min blocked)
   - ✅ Request cannot be cancelled after sending

2. **RequestQueueManager Tests** (`request_queue_test.go`)
   - ✅ Enqueue request adds to queue
   - ✅ Only one active request per player
   - ✅ Complete request moves to next in queue
   - ✅ Queue length reported correctly
   - ✅ Remove request from queue

3. **ShareHistoryService Tests** (`share_history_test.go`)
   - ✅ Record share creates entry
   - ✅ Query player history returns correct records
   - ✅ Query game history returns all records
   - ✅ Filter by share type
   - ✅ Filter by status
   - ✅ Export to JSON

### Frontend

1. **ShareButton Tests** (`ShareButton.test.tsx`)
   - ✅ Button renders for players in same room
   - ✅ Button NOT visible for players in different room
   - ✅ Disabled for disconnected players
   - ✅ Shows checkmark if already shared
   - ✅ Opens share type selector on click
   - ✅ Shows confirmation modal before sending
   - ✅ Confirmation displays target name and share type
   - ✅ "Go Back" returns to selector
   - ✅ "Yes, Send" emits SHARE_REQUEST event
   - ✅ Negotiator: COLOR_ONLY option disabled
   - ✅ Negotiator: FULL_CARD pre-selected
   - ✅ Negotiator: Shows restriction tooltip
   - ✅ Shy Guy: Share button hidden/disabled
   - ✅ Normal player: Both options available

2. **ShareRequestNotification Tests** (`ShareRequestNotification.test.tsx`)
   - ✅ Displays sender name
   - ✅ Displays share type
   - ✅ Shows countdown timer
   - ✅ Accept button emits response
   - ✅ Decline button emits response
   - ✅ Shows queue length indicator
   - ✅ Cannot dismiss without responding

3. **CardDisplay Tests** (`CardDisplay.test.tsx`)
   - ✅ Color-only shows team color badge
   - ✅ Full card shows role name
   - ✅ Spy indicator shown for full card spies
   - ✅ Close button dismisses modal
   - ✅ Timestamp displayed correctly

4. **ShareHistory Tests** (`ShareHistory.test.tsx`)
   - ✅ Displays sent/received tabs
   - ✅ Color-coded status indicators
   - ✅ Filter by status
   - ✅ Scrollable list
   - ✅ Timestamp formatting

5. **RoomActivityFeed Tests** (`RoomActivityFeed.test.tsx`)
   - ✅ Displays share activities
   - ✅ Shows sender and target names
   - ✅ Shows share type
   - ✅ Auto-scrolls to latest activity
   - ✅ Collapsible/expandable
   - ✅ Mobile swipe functionality

## Integration Tests

1. **Full Share Flow**
   - Player A sends color-only request to Player B
   - Player B receives notification
   - Player B accepts
   - Player B sees card (with deception if spy)
   - Both histories updated

2. **Decline Flow**
   - Player A sends request to Player B
   - Player B declines
   - Player A notified
   - No card data revealed
   - Histories updated

3. **Timeout Flow**
   - Player A sends request to Player B
   - 30 seconds elapse
   - Auto-decline triggered
   - Both players notified
   - Histories updated

4. **Queue Management**
   - Player A sends request to Player C
   - Player B sends request to Player C
   - Player C sees one notification at a time
   - After responding, next request appears

5. **Spy Deception**
   - Red Spy shares color-only
   - Target sees "BLUE TEAM"
   - Red Spy shares full card
   - Target sees "Red Spy" with spy indicator

6. **Room Broadcasting**
   - Player A and Player B are in Red Room
   - Player C is also in Red Room
   - Player D is in Blue Room
   - Player A shares with Player B (accepted)
   - Player C receives ROOM_SHARE_NOTIFICATION
   - Player D does NOT receive notification
   - Activity feed shows: "[A] shared with [B] (Color Only)"
   - Verify no card data in room broadcast

7. **Role Restrictions - Negotiator**
   - Player A is Negotiator role
   - Player B is normal role
   - Player A opens share dialog
   - UI shows only FULL_CARD option (COLOR_ONLY disabled)
   - Player A sends FULL_CARD share request
   - Request succeeds
   - Player A attempts COLOR_ONLY via API
   - Server rejects with "negotiator can only share full cards"
   - Share history shows only FULL_CARD shares for Player A

8. **Role Restrictions - Paranoid**
   - Player A is Paranoid role (max 1 share per game)
   - Player A shares with Player B (accepted)
   - Share count incremented to 1
   - Player A attempts second share with Player C
   - Server rejects with "maximum shares per game exceeded (1/1)"
   - UI shows "You have used your only share" message

## E2E Tests (Playwright)

```typescript
test('complete share flow with acceptance', async ({ page, context }) => {
  // 1. Create game with 2 players (Alice, Bob)
  const alice = await createPlayer(page, 'Alice');
  const bob = await createPlayer(context.newPage(), 'Bob');

  // 2. Alice clicks share on Bob
  await alice.click('[data-testid="player-Bob"] [data-testid="share-button"]');

  // 3. Select "Color Only"
  await alice.click('[data-testid="share-type-color-only"]');
  await alice.click('[data-testid="send-request"]');

  // 4. Verify Bob receives notification
  await expect(bob.locator('[data-testid="share-request-notification"]')).toBeVisible();
  await expect(bob.locator('[data-testid="sender-name"]')).toHaveText('Alice');

  // 5. Bob accepts
  await bob.click('[data-testid="accept-share"]');

  // 6. Verify Bob sees card display
  await expect(bob.locator('[data-testid="card-display"]')).toBeVisible();
  await expect(bob.locator('[data-testid="team-color"]')).toContainText('TEAM');

  // 7. Verify Alice receives acceptance notification
  await expect(alice.locator('[data-testid="toast"]')).toContainText('Bob accepted');

  // 8. Verify share histories updated
  await alice.click('[data-testid="share-history-button"]');
  await expect(alice.locator('[data-testid="history-item"]')).toContainText('Bob');
  await expect(alice.locator('[data-testid="history-status"]')).toHaveClass(/accepted/);
});
```

## Performance Tests

- **Request Latency:** 95th percentile < 500ms
- **Concurrent Requests:** Support 100 simultaneous requests
- **Memory Usage:** <10MB for 1000 share records
- **WebSocket Throughput:** 1000 messages/second
