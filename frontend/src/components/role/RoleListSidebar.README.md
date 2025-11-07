# RoleListSidebar Component

A responsive sidebar component that displays the role configuration for the current game room. The sidebar shows detailed information about all available roles, their teams, counts, and descriptions.

## Features

- **Fixed left sidebar** that displays role configuration details
- **Fully responsive** - always visible on desktop, collapsible on mobile
- **Mobile-friendly** - slides in from left with backdrop overlay
- **Team organization** - roles grouped by RED, BLUE, and GRAY teams
- **Role details** - shows name, team badge, count, description, and special badges (leader, spy)
- **Loading and error states** - graceful handling of API states
- **Dark mode support** - uses CSS variables for theming
- **Accessible** - proper ARIA labels and keyboard navigation

## Props

```typescript
interface RoleListSidebarProps {
  roleConfigId?: string;    // Role configuration ID (default: 'standard')
  isOpen?: boolean;         // Controls mobile sidebar visibility (default: false)
  onToggle?: () => void;    // Callback when toggle button is clicked
}
```

## Usage

### Basic Usage

```tsx
import { RoleListSidebar } from './components/RoleListSidebar';

function GamePage() {
  return (
    <div>
      <RoleListSidebar roleConfigId="standard" />
      <main style={{ marginLeft: '280px' }}>
        {/* Your game content */}
      </main>
    </div>
  );
}
```

### Controlled Mobile State

```tsx
import { useState } from 'react';
import { RoleListSidebar } from './components/RoleListSidebar';

function GamePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div>
      <RoleListSidebar
        roleConfigId="standard"
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <main style={{ marginLeft: '280px' }}>
        {/* Your game content */}
      </main>
    </div>
  );
}
```

## Layout Integration

### Desktop Layout

On desktop (min-width: 768px):
- Sidebar is **always visible** at 280px width
- Main content should have `margin-left: 280px` to avoid overlap
- Toggle button and backdrop are hidden

```tsx
<div style={{ position: 'relative', minHeight: '100vh' }}>
  <RoleListSidebar />
  <main style={{ marginLeft: '280px', padding: '2rem' }}>
    {/* Content */}
  </main>
</div>
```

### Mobile Layout

On mobile (max-width: 768px):
- Sidebar is **hidden by default**, slides in when opened
- Toggle button (☰) appears in top-left corner
- Backdrop overlay appears when sidebar is open
- Main content should be full width
- Consider adding top padding for toggle button

```tsx
<div style={{ position: 'relative', minHeight: '100vh' }}>
  <RoleListSidebar isOpen={isOpen} onToggle={toggleSidebar} />
  <main style={{ padding: '1rem', paddingTop: '4rem' }}>
    {/* Content - paddingTop leaves space for toggle button */}
  </main>
</div>
```

### Responsive CSS

```css
/* Main content responsive spacing */
.main-content {
  margin-left: 280px;
  padding: 2rem;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    padding: 1rem;
    padding-top: 4rem; /* Space for toggle button */
  }
}
```

## Component Structure

### Role Information Display

Each role shows:
1. **Team color indicator** - Small colored dot
2. **Role name** - Korean name (fallback to English)
3. **Role count** - Fixed number (e.g., "1명") or variable ("가변")
4. **Role description** - Korean description (fallback to English)
5. **Special badges** - "👑 리더" for leaders, "🕵️ 스파이" for spies

### Team Organization

Roles are grouped by team in this order:
1. **RED Team** (레드 팀) - Red color (`--color-red`)
2. **BLUE Team** (블루 팀) - Blue color (`--color-blue`)
3. **GRAY Team** (그레이 팀) - Gray color (`--color-gray`)

Within each team, roles are sorted by **priority** (highest first).

## Styling

### CSS Variables

The component uses the following CSS variables from your theme:

```css
--text-primary        /* Primary text color */
--text-secondary      /* Secondary text color */
--bg-primary          /* Primary background color */
--bg-secondary        /* Secondary background color */
--bg-card             /* Card background color */
--border-color        /* Border color */
--color-red           /* Red team color */
--color-blue          /* Blue team color */
--color-gray          /* Gray team color */
```

### Custom Styling

The component includes internal styles for:
- Responsive behavior (desktop/mobile)
- Smooth transitions for sidebar toggle
- Custom scrollbar styling
- Hover effects on desktop

## Accessibility

- **ARIA labels** on all interactive elements
- **Keyboard navigation** fully supported
- **Screen reader friendly** - proper heading hierarchy
- **Focus management** - visible focus indicators
- **Touch targets** - minimum 44px height on mobile

## API Integration

The component fetches role configuration from:

```typescript
import { getRoleConfig } from '../services/api';

// GET /api/v1/role-configs/{configId}
const config: RoleConfig = await getRoleConfig('standard');
```

### Role Config Response

```typescript
interface RoleConfig {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  version?: string;
  roles: RoleDefinition[];
}

interface RoleDefinition {
  id: string;
  name: string;
  nameKo: string;
  team: 'RED' | 'BLUE' | 'GRAY';
  type: 'leader' | 'spy' | 'support' | 'standard';
  description?: string;
  descriptionKo?: string;
  count: number | Record<string, number>;
  minPlayers: number;
  priority: number;
  color?: string;
  icon?: string;
}
```

## States

### Loading State

Shows centered "로딩 중..." message while fetching role configuration.

### Error State

Displays error message "역할 설정을 불러올 수 없습니다" with red styling if API fails.

### Success State

Displays full role configuration with team grouping and role details.

### Empty State

If role configuration has no roles, shows "역할 정보를 불러올 수 없습니다" message.

## Mobile Behavior

### Toggle Button
- Positioned at top-left (1rem from edges)
- Z-index: 200 (above sidebar)
- Hamburger icon (☰)
- Only visible on mobile

### Sidebar Animation
- Starts off-screen: `translateX(-100%)`
- Slides in: `translateX(0)` with 0.3s ease-in-out transition
- Max width: 320px on mobile (can be narrower on small screens)

### Backdrop
- Semi-transparent overlay: `rgba(0, 0, 0, 0.5)`
- Z-index: 99 (below sidebar, above content)
- Clicking backdrop closes sidebar

### Close Button
- X button in top-right of sidebar header
- Only visible on mobile
- Closes sidebar when clicked

## Performance Considerations

1. **Memoization** - Consider wrapping in `React.memo` if used in frequently re-rendering parent
2. **Lazy loading** - API fetch only happens when component mounts or configId changes
3. **Smooth scrolling** - Custom scrollbar with hardware-accelerated CSS
4. **Conditional rendering** - Mobile controls only rendered when needed

## Browser Support

- **Modern browsers** - Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile browsers** - iOS Safari, Chrome Mobile
- **CSS Grid/Flexbox** - Required for layout
- **CSS Variables** - Required for theming

## Testing

Comprehensive test suite with 18 tests covering:
- Loading states
- Error handling
- Role display and grouping
- Team sorting
- Mobile toggle functionality
- Accessibility
- API integration
- Edge cases (empty roles, missing translations)

Run tests:
```bash
npm test -- RoleListSidebar.test.tsx
```

## Troubleshooting

### Sidebar not visible on desktop
- Ensure main content has `margin-left: 280px`
- Check that parent container allows fixed positioning

### Mobile toggle not working
- Verify `isOpen` prop and `onToggle` callback are provided
- Check z-index conflicts with other UI elements

### API errors
- Verify backend API is running
- Check network tab for failed requests
- Ensure role configuration exists in backend

### Styling issues
- Verify CSS variables are defined in `:root`
- Check for CSS conflicts with global styles
- Ensure theme system is properly configured

## Future Enhancements

Potential improvements:
- Search/filter roles by name
- Collapse/expand team sections
- Role detail modal on click
- Print-friendly view
- Export role list as PDF
- Customizable width
- Animation preferences (reduced motion support)
