# UI/UX Design - Online Card Share Feature

## Share Button Design

**Location:** On each player card in player list

```
┌────────────────────────────┐
│ Player Name             ✓  │  ← Checkmark if already shared
│ [Red Team]                 │
│                            │
│ ┌──────────────────┐       │
│ │  🔄 Share Card   │       │  ← Primary action button
│ └──────────────────┘       │
└────────────────────────────┘
```

## Share Type Selector Modal (Normal Player)

```
┌─────────────────────────────────────┐
│       Share with Player B           │
├─────────────────────────────────────┤
│ Choose what to share:               │
│                                     │
│ ◉ Color Only                        │
│   Show only your team color         │
│   (Red or Blue)                     │
│                                     │
│ ○ Full Card                         │
│   Show your complete role           │
│   including role name               │
│                                     │
│ ┌───────────┐  ┌───────────┐      │
│ │  Cancel   │  │   Send    │      │
│ └───────────┘  └───────────┘      │
└─────────────────────────────────────┘
```

## Share Type Selector Modal (Negotiator)

```
┌─────────────────────────────────────┐
│       Share with Player B           │
├─────────────────────────────────────┤
│ ℹ️ Negotiator: Can only share      │
│    full cards                       │
│                                     │
│ ○ Color Only (disabled)             │
│   Show only your team color         │
│   [Not available for Negotiator]    │
│                                     │
│ ◉ Full Card ✓                       │
│   Show your complete role           │
│   including role name               │
│                                     │
│ ┌───────────┐  ┌───────────┐      │
│ │  Cancel   │  │   Send    │      │
│ └───────────┘  └───────────┘      │
└─────────────────────────────────────┘
```

**Negotiator Features (when Negotiator is the sender):**
- Color Only option is visually disabled (grayed out)
- Full Card is pre-selected and has checkmark
- Info message explains the restriction
- Attempting to select Color Only shows tooltip
- Send button works only with Full Card selected

**Important:** When a Negotiator is the target (receiver) of a share request, the requester sees the normal UI with both options available. The requester does NOT receive any information that the target is a Negotiator. Role restrictions are enforced only when the Negotiator is sending, not receiving.

## Confirmation Modal

```
┌─────────────────────────────────────┐
│       Confirm Card Share            │
├─────────────────────────────────────┤
│                                     │
│  ⚠️  Are you sure?                  │
│                                     │
│  You are about to share your card:  │
│                                     │
│  👤 With: Bob                       │
│  📋 Type: Full Card                 │
│                                     │
│  ⚠️  This cannot be cancelled once  │
│     sent!                           │
│                                     │
│ ┌───────────┐  ┌───────────┐      │
│ │  Go Back  │  │ Yes, Send │      │
│ └───────────┘  └───────────┘      │
└─────────────────────────────────────┘
```

**Confirmation Features:**
- Shows target player name clearly
- Shows selected share type
- Warning that request cannot be cancelled
- "Go Back" returns to share type selector
- "Yes, Send" sends request immediately
- Prevents accidental shares
- Required for all share requests

## Share Request Notification (Target Player)

```
┌─────────────────────────────────────────┐
│  🔔 Share Request from Alice            │
├─────────────────────────────────────────┤
│                                         │
│  Alice wants to share their card        │
│                                         │
│  Share Type: 🎨 Color Only              │
│                                         │
│  ⏱️  Time remaining: 0:28                │
│                                         │
│  ┌────────────────┐  ┌────────────────┐│
│  │  ✅ Accept     │  │  ❌ Decline    ││
│  └────────────────┘  └────────────────┘│
│                                         │
│  📊 2 more requests waiting             │
└─────────────────────────────────────────┘
```

## Card Display - Color Only

```
┌──────────────────────────────┐
│  Card from Alice             │
├──────────────────────────────┤
│                              │
│        ┌──────────┐          │
│        │          │          │
│        │   BLUE   │          │
│        │   TEAM   │          │
│        │          │          │
│        └──────────┘          │
│                              │
│  Type: Color Only            │
│  Shared: 12:34:56            │
│                              │
│  ┌──────────────────┐        │
│  │     Close        │        │
│  └──────────────────┘        │
└──────────────────────────────┘
```

## Card Display - Full Card

```
┌──────────────────────────────┐
│  Card from Alice             │
├──────────────────────────────┤
│                              │
│    🔵 Blue Operative         │
│                              │
│    Team: BLUE TEAM           │
│    Role: Operative           │
│                              │
│    Type: Full Card           │
│    Shared: 12:34:56          │
│                              │
│  ┌──────────────────┐        │
│  │     Close        │        │
│  └──────────────────┘        │
└──────────────────────────────┘
```

## Card Display - Spy (Full Card)

**Scenario:** Charlie's actual role is **Red Spy** (on Red Team), but when they do a full card share, the receiver sees:

```
┌──────────────────────────────┐
│  Card from Charlie           │
├──────────────────────────────┤
│                              │
│    🔵                        │  ← Blue badge (opposite color)
│                              │
│    Red Spy                   │  ← Actual spy role name
│                              │
│    ⚠️  This player is a SPY  │
│                              │
│    Type: Full Card           │
│    Shared: 12:34:56          │
│                              │
│  ┌──────────────────┐        │
│  │     Close        │        │
│  └──────────────────┘        │
└──────────────────────────────┘
```

**What the receiver sees:**
- Color badge: 🔵 Blue (DECEPTION - opposite team color)
- Role name: "Red Spy" (TRUTH - cannot be hidden)
- Spy indicator: ⚠️ (TRUTH - they know it's a spy)
- NO "Team:" label shown (avoids "Red Spy on Blue Team" contradiction)

**Spy Deception Rules:**
- **Red Spy** → Blue color badge 🔵 + "Red Spy" role name + ⚠️ SPY indicator
- **Blue Spy** → Red color badge 🔴 + "Blue Spy" role name + ⚠️ SPY indicator
- The spy role name is ALWAYS revealed in full card shares
- The color badge shows the OPPOSITE team color (deception)
- No "Team:" text label is shown to avoid logical contradiction
- Receiver sees the spy's actual role name but with a misleading color indicator

## Share History Panel

```
┌─────────────────────────────────────┐
│  Share History                  ✕   │
├─────────────────────────────────────┤
│  [Sent] [Received] [All]            │
├─────────────────────────────────────┤
│                                     │
│  ✅ 12:45  You → Bob                │
│            Color Only (Accepted)    │
│                                     │
│  ❌ 12:43  Alice → You              │
│            Full Card (Declined)     │
│                                     │
│  ⏳ 12:40  You → Charlie            │
│            Color Only (Pending)     │
│                                     │
│  ⏱️ 12:38  You → Diana              │
│            Full Card (Timeout)      │
│                                     │
│  ✅ 12:35  Eve → You                │
│            Color Only (Accepted)    │
│                                     │
└─────────────────────────────────────┘
```

## Outgoing Requests Widget

```
┌────────────────────────────┐
│ Pending Requests (2)    ▼  │
├────────────────────────────┤
│ Bob - Color Only    [✕]   │
│ Charlie - Full Card [✕]   │
└────────────────────────────┘
```

## Room Activity Feed

**Location:** Side panel or bottom of room view

```
┌─────────────────────────────────────┐
│  Room Activity               ▼ △    │
├─────────────────────────────────────┤
│                                     │
│  🔄 12:45  Alice shared with Bob    │
│           (Color Only)              │
│                                     │
│  🔄 12:43  Charlie shared with Eve  │
│           (Full Card)               │
│                                     │
│  🔄 12:40  Bob shared with Alice    │
│           (Color Only)              │
│                                     │
│  🔄 12:38  Diana shared with Frank  │
│           (Full Card)               │
│                                     │
│  [Scroll for more...]              │
└─────────────────────────────────────┘
```

**Features:**
- Scrollable feed showing recent share activity
- Only shows shares where BOTH players are in your room
- Color-coded by share type
- Timestamp for each activity
- Auto-scrolls when new activity appears
- Collapsible to save screen space
- Mobile: Swipe up to expand

**Activity Message Format:**
- "🔄 [Time] [Sender] shared with [Target] (Type)"
- Does NOT show card information
- Helps players track trust networks
