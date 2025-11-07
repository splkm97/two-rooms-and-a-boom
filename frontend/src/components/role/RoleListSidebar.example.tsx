/**
 * RoleListSidebar Usage Examples
 *
 * This file demonstrates how to use the RoleListSidebar component in different scenarios.
 */

import { useState } from 'react';
import { RoleListSidebar } from './RoleListSidebar';

/**
 * Example 1: Basic usage with default role config
 */
export function BasicExample() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <RoleListSidebar />
      <main style={{ marginLeft: '280px', padding: '2rem' }}>
        <h1>Game Content</h1>
        <p>Your main game content goes here...</p>
      </main>
    </div>
  );
}

/**
 * Example 2: With custom role configuration
 */
export function CustomRoleConfigExample() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <RoleListSidebar roleConfigId="expansion" />
      <main style={{ marginLeft: '280px', padding: '2rem' }}>
        <h1>Expansion Game</h1>
        <p>Playing with expansion role configuration...</p>
      </main>
    </div>
  );
}

/**
 * Example 3: Controlled mobile toggle state
 */
export function ControlledMobileExample() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <RoleListSidebar
        roleConfigId="standard"
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <main style={{ marginLeft: '280px', padding: '2rem' }}>
        <h1>Controlled Sidebar</h1>
        <p>The sidebar toggle state is managed by the parent component.</p>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          Toggle Sidebar
        </button>
      </main>
    </div>
  );
}

/**
 * Example 4: In a room/game page with dynamic role config
 */
export function RoomPageExample() {
  const [roomRoleConfigId, setRoomRoleConfigId] = useState<string>('standard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <RoleListSidebar
        roleConfigId={roomRoleConfigId}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <main
        style={{
          marginLeft: '280px',
          padding: '2rem',
          '@media (max-width: 768px)': {
            marginLeft: 0,
          },
        }}
      >
        <h1>Game Room</h1>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            Select Game Mode:
            <select
              value={roomRoleConfigId}
              onChange={(e) => setRoomRoleConfigId(e.target.value)}
              style={{ marginLeft: '0.5rem' }}
            >
              <option value="standard">기본 게임</option>
              <option value="expansion">확장 게임</option>
            </select>
          </label>
        </div>

        <div>
          <h2>Players</h2>
          <p>Player list goes here...</p>
        </div>
      </main>
    </div>
  );
}

/**
 * Example 5: Responsive layout with proper spacing
 */
export function ResponsiveLayoutExample() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <RoleListSidebar
        roleConfigId="standard"
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Desktop: margin-left for sidebar, Mobile: full width */}
      <main
        style={{
          marginLeft: 'var(--sidebar-width, 280px)',
          padding: 'clamp(1rem, 3vw, 2rem)',
          minHeight: '100vh',
        }}
        className="main-content"
      >
        <h1>Responsive Layout</h1>
        <p>This layout adapts to mobile and desktop views.</p>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
            padding-top: 4rem; /* Space for toggle button */
          }
        }
      `}</style>
    </div>
  );
}
