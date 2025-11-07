import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoomListItem } from '../RoomListItem';
import type { RoomListItem as RoomListItemType } from '../../types/game.types';

describe('RoomListItem', () => {
  const mockOnJoin = vi.fn();

  const createMockRoom = (overrides?: Partial<RoomListItemType>): RoomListItemType => ({
    code: 'ABC123',
    status: 'WAITING',
    currentPlayers: 3,
    maxPlayers: 10,
    isPublic: true,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    updatedAt: new Date().toISOString(),
    hostNickname: 'TestHost',
    ...overrides,
  });

  beforeEach(() => {
    mockOnJoin.mockClear();
  });

  it('renders room code in monospace font', () => {
    const room = createMockRoom();
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    const codeElement = screen.getByText('ABC123');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toHaveStyle({ fontFamily: 'monospace' });
  });

  it('displays host nickname when provided', () => {
    const room = createMockRoom({ hostNickname: 'TestHost' });
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    expect(screen.getByText(/방장: TestHost/)).toBeInTheDocument();
  });

  it('does not display host nickname when not provided', () => {
    const room = createMockRoom({ hostNickname: undefined });
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    expect(screen.queryByText(/방장:/)).not.toBeInTheDocument();
  });

  it('displays player count correctly', () => {
    const room = createMockRoom({ currentPlayers: 3, maxPlayers: 10 });
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    expect(screen.getByText('3/10명')).toBeInTheDocument();
  });

  it('shows green status for waiting rooms', () => {
    const room = createMockRoom({ status: 'WAITING', currentPlayers: 3, maxPlayers: 10 });
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    expect(screen.getByText('🟢')).toBeInTheDocument();
    expect(screen.getByText('대기 중')).toBeInTheDocument();
  });

  it('shows yellow status for in-progress rooms', () => {
    const room = createMockRoom({ status: 'IN_PROGRESS', currentPlayers: 8, maxPlayers: 10 });
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    expect(screen.getByText('🟡')).toBeInTheDocument();
    expect(screen.getByText('게임 중')).toBeInTheDocument();
  });

  it('shows red status for full rooms', () => {
    const room = createMockRoom({ currentPlayers: 10, maxPlayers: 10 });
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    expect(screen.getByText('🔴')).toBeInTheDocument();
    expect(screen.getAllByText('가득참').length).toBeGreaterThan(0);
  });

  it('displays time ago correctly', () => {
    const room = createMockRoom();
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    // Should show "5분 전" for room created 5 minutes ago
    expect(screen.getByText(/분 전/)).toBeInTheDocument();
  });

  it('enables join button for waiting rooms with space', () => {
    const room = createMockRoom({ status: 'WAITING', currentPlayers: 3, maxPlayers: 10 });
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    const joinButton = screen.getByRole('button', { name: '참가' });
    expect(joinButton).toBeEnabled();
  });

  it('disables join button for full rooms', () => {
    const room = createMockRoom({ status: 'WAITING', currentPlayers: 10, maxPlayers: 10 });
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    const joinButton = screen.getByRole('button', { name: '가득참' });
    expect(joinButton).toBeDisabled();
  });

  it('disables join button for in-progress rooms', () => {
    const room = createMockRoom({ status: 'IN_PROGRESS', currentPlayers: 8, maxPlayers: 10 });
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    const joinButton = screen.getByRole('button', { name: '참가 불가' });
    expect(joinButton).toBeDisabled();
  });

  it('calls onJoin with room code when join button clicked', () => {
    const room = createMockRoom({ status: 'WAITING', currentPlayers: 3, maxPlayers: 10 });
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    const joinButton = screen.getByRole('button', { name: '참가' });
    fireEvent.click(joinButton);

    expect(mockOnJoin).toHaveBeenCalledWith('ABC123');
    expect(mockOnJoin).toHaveBeenCalledTimes(1);
  });

  it('does not call onJoin when disabled button clicked', () => {
    const room = createMockRoom({ status: 'WAITING', currentPlayers: 10, maxPlayers: 10 });
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    const joinButton = screen.getByRole('button', { name: '가득참' });
    fireEvent.click(joinButton);

    expect(mockOnJoin).not.toHaveBeenCalled();
  });

  it('has minimum touch target height of 44px for join button', () => {
    const room = createMockRoom();
    render(<RoomListItem room={room} onJoin={mockOnJoin} />);

    const joinButton = screen.getByRole('button', { name: '참가' });
    expect(joinButton).toHaveStyle({ minHeight: '44px' });
  });
});
