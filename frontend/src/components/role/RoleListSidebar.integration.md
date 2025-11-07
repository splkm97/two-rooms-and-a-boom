# RoleListSidebar Integration Guide

This guide shows how to integrate the RoleListSidebar component into existing pages.

## Integration with RoomPage

The RoleListSidebar is designed to work seamlessly with the existing RoomPage component.

### Step 1: Import the Component

```tsx
import { RoleListSidebar } from '../components/RoleListSidebar';
```

### Step 2: Add State for Mobile Toggle

```tsx
export function RoomPage() {
  // ... existing state ...
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ... rest of component
}
```

### Step 3: Add Sidebar to Layout

```tsx
export function RoomPage() {
  // ... state and hooks ...

  return (
    <Layout>
      {/* Add RoleListSidebar before main content */}
      {room?.roleConfigId && (
        <RoleListSidebar
          roleConfigId={room.roleConfigId}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      )}

      {/* Wrap main content with margin for desktop */}
      <div
        style={{
          marginLeft: '280px', // Space for sidebar on desktop
          padding: 'clamp(1rem, 3vw, 2rem)',
        }}
        className="room-page-content"
      >
        {/* Existing room content */}
        {loading && <LoadingSpinner />}
        {error && <div className="error">{error}</div>}
        {room && (
          // ... existing room UI
        )}
      </div>

      {/* Add responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .room-page-content {
            margin-left: 0 !important;
            padding-top: 4rem; /* Space for sidebar toggle button */
          }
        }
      `}</style>
    </Layout>
  );
}
```

### Step 4: Complete Integration Example

Here's a complete example showing the RoleListSidebar integrated into RoomPage:

```tsx
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { RoleListSidebar } from '../components/RoleListSidebar';
// ... other imports

export function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'lobby';

  // State
  const [room, setRoom] = useState<Room | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // ... other hooks and handlers

  return (
    <Layout>
      {/* Role List Sidebar - only show when room is loaded */}
      {room?.roleConfigId && (
        <RoleListSidebar
          roleConfigId={room.roleConfigId}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      )}

      {/* Main Content Area */}
      <div
        style={{
          marginLeft: '280px',
          padding: 'clamp(1rem, 3vw, 2rem)',
          minHeight: '100vh',
        }}
        className="room-page-content"
      >
        {loading && <LoadingSpinner />}

        {!loading && room && (
          <>
            {/* Lobby View */}
            {view === 'lobby' && (
              <div>
                <h1>방 {roomCode}</h1>
                <PlayerList players={room.players} />
                {/* ... other lobby UI */}
              </div>
            )}

            {/* Game View */}
            {view === 'game' && (
              <div>
                <h1>게임 진행 중</h1>
                {/* ... game UI */}
              </div>
            )}

            {/* Reveal View */}
            {view === 'reveal' && (
              <div>
                <h1>최종 결과</h1>
                {/* ... reveal UI */}
              </div>
            )}
          </>
        )}
      </div>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          .room-page-content {
            margin-left: 0 !important;
            padding-top: 4rem;
          }
        }
      `}</style>
    </Layout>
  );
}
```

## Integration with Other Pages

### GamePage Integration

```tsx
import { useState } from 'react';
import { RoleListSidebar } from '../components/RoleListSidebar';

export function GamePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const roleConfigId = 'standard'; // Get from room state

  return (
    <>
      <RoleListSidebar
        roleConfigId={roleConfigId}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <main style={{ marginLeft: '280px' }} className="game-content">
        {/* Game content */}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .game-content {
            margin-left: 0 !important;
            padding-top: 4rem;
          }
        }
      `}</style>
    </>
  );
}
```

### LobbyPage Integration

```tsx
import { useState } from 'react';
import { RoleListSidebar } from '../components/RoleListSidebar';

export function LobbyPage({ room }: { room: Room }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      {room.roleConfigId && (
        <RoleListSidebar
          roleConfigId={room.roleConfigId}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      )}

      <main style={{ marginLeft: '280px' }} className="lobby-content">
        {/* Lobby content */}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .lobby-content {
            margin-left: 0 !important;
            padding-top: 4rem;
          }
        }
      `}</style>
    </>
  );
}
```

## Layout Considerations

### With Layout Component

If using the existing Layout component:

```tsx
<Layout>
  <RoleListSidebar roleConfigId="standard" isOpen={isOpen} onToggle={toggle} />
  <div className="content-with-sidebar">
    {/* Your content */}
  </div>
</Layout>
```

### Without Layout Component

If not using a layout wrapper:

```tsx
<>
  <RoleListSidebar roleConfigId="standard" isOpen={isOpen} onToggle={toggle} />
  <div className="page-content">
    {/* Your content */}
  </div>
</>
```

## Responsive Design Tips

### 1. Content Margin

Always add left margin to main content on desktop:

```css
.main-content {
  margin-left: 280px; /* Sidebar width */
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }
}
```

### 2. Toggle Button Space

Add top padding on mobile to avoid overlap with toggle button:

```css
@media (max-width: 768px) {
  .main-content {
    padding-top: 4rem; /* Space for toggle button */
  }
}
```

### 3. Using clamp() for Fluid Spacing

```css
.main-content {
  margin-left: 280px;
  padding: clamp(1rem, 3vw, 2rem); /* Fluid padding */
}
```

## State Management

### Local State (Recommended for Simple Cases)

```tsx
const [isSidebarOpen, setIsSidebarOpen] = useState(false);

<RoleListSidebar
  isOpen={isSidebarOpen}
  onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
/>
```

### Context (For Complex Apps)

```tsx
// SidebarContext.tsx
const SidebarContext = createContext({
  isOpen: false,
  toggle: () => {},
});

// App.tsx
<SidebarContext.Provider value={{ isOpen, toggle }}>
  <RoleListSidebar isOpen={isOpen} onToggle={toggle} />
</SidebarContext.Provider>
```

### URL State (For Shareable State)

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const isSidebarOpen = searchParams.get('sidebar') === 'open';

const toggleSidebar = () => {
  setSearchParams(prev => {
    prev.set('sidebar', isSidebarOpen ? 'closed' : 'open');
    return prev;
  });
};

<RoleListSidebar
  isOpen={isSidebarOpen}
  onToggle={toggleSidebar}
/>
```

## Conditional Rendering

### Show Only When Role Config is Available

```tsx
{room?.roleConfigId && (
  <RoleListSidebar
    roleConfigId={room.roleConfigId}
    isOpen={isSidebarOpen}
    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
  />
)}
```

### Show Only in Specific Views

```tsx
{(view === 'lobby' || view === 'game') && room?.roleConfigId && (
  <RoleListSidebar
    roleConfigId={room.roleConfigId}
    isOpen={isSidebarOpen}
    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
  />
)}
```

### Hide During Loading

```tsx
{!loading && room?.roleConfigId && (
  <RoleListSidebar
    roleConfigId={room.roleConfigId}
    isOpen={isSidebarOpen}
    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
  />
)}
```

## Performance Optimization

### Memoize Toggle Handler

```tsx
import { useCallback } from 'react';

const toggleSidebar = useCallback(() => {
  setIsSidebarOpen(prev => !prev);
}, []);

<RoleListSidebar
  roleConfigId={room.roleConfigId}
  isOpen={isSidebarOpen}
  onToggle={toggleSidebar}
/>
```

### Lazy Load Sidebar

```tsx
import { lazy, Suspense } from 'react';

const RoleListSidebar = lazy(() =>
  import('../components/RoleListSidebar').then(m => ({
    default: m.RoleListSidebar
  }))
);

<Suspense fallback={<div>Loading sidebar...</div>}>
  <RoleListSidebar roleConfigId="standard" />
</Suspense>
```

## Accessibility Tips

### Focus Management

```tsx
const sidebarRef = useRef<HTMLElement>(null);

const toggleSidebar = () => {
  setIsSidebarOpen(prev => {
    const newState = !prev;
    if (newState) {
      // Focus sidebar when opened
      setTimeout(() => sidebarRef.current?.focus(), 100);
    }
    return newState;
  });
};
```

### Keyboard Shortcuts

```tsx
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Toggle sidebar with Ctrl+B or Cmd+B
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      setIsSidebarOpen(prev => !prev);
    }
    // Close sidebar with Escape
    if (e.key === 'Escape' && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [isSidebarOpen]);
```

## Common Issues and Solutions

### Issue: Content Jumps on Mobile

**Solution:** Use consistent padding/margins

```css
.main-content {
  padding: 2rem;
  margin-left: 280px;
  transition: margin-left 0.3s ease;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    padding-top: 4rem;
  }
}
```

### Issue: Sidebar Overlaps Fixed Headers

**Solution:** Adjust z-index values

```css
/* Sidebar: z-index 100 */
/* Header: z-index 50 */
/* Toggle button: z-index 200 */
```

### Issue: Sidebar Not Closing on Route Change

**Solution:** Reset state on navigation

```tsx
useEffect(() => {
  setIsSidebarOpen(false);
}, [location.pathname]);
```

## Testing Integration

```tsx
import { render, screen } from '@testing-library/react';
import { RoomPage } from './RoomPage';

describe('RoomPage with RoleListSidebar', () => {
  it('should render sidebar when room has roleConfigId', async () => {
    render(<RoomPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('역할 목록 사이드바')).toBeInTheDocument();
    });
  });

  it('should not render sidebar when room has no roleConfigId', () => {
    render(<RoomPage />);

    expect(screen.queryByLabelText('역할 목록 사이드바')).not.toBeInTheDocument();
  });
});
```
