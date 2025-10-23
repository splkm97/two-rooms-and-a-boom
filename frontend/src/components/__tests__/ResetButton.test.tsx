/**
 * T093: Test ResetButton component functionality
 *
 * Note: The reset button is integrated into GamePage rather than being
 * a separate component. This test file tests the reset button behavior
 * as it appears in the GamePage component.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { GamePage } from '../../pages/GamePage';
import * as api from '../../services/api';
import type { Role, TeamColor, RoomColor } from '../../types/game.types';

// Mock API
vi.mock('../../services/api', () => ({
  resetGame: vi.fn(),
}));

// Mock useWebSocket hook
let mockLastMessage: any = null;

vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    lastMessage: mockLastMessage,
    sendMessage: vi.fn(),
    connectionError: null,
    reconnectAttempts: 0,
    manualReconnect: vi.fn(),
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ roomCode: 'ABC123' }),
  };
});

describe('ResetButton (integrated in GamePage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Set up role assignment to show the game page
    const mockRole: Role = {
      id: 'president',
      name: '대통령',
      description: '블루 팀의 리더입니다',
      team: 'BLUE',
      isLeader: true,
      isSpy: false,
    };

    mockLastMessage = {
      type: 'ROLE_ASSIGNED',
      payload: {
        role: mockRole,
        team: 'BLUE' as TeamColor,
        currentRoom: 'BLUE_ROOM' as RoomColor,
      },
    };
  });

  const renderGamePageAsOwner = () => {
    localStorage.setItem('playerId_ABC123', '1');
    localStorage.setItem('isOwner_ABC123', 'true');

    return render(
      <BrowserRouter>
        <GamePage />
      </BrowserRouter>
    );
  };

  const renderGamePageAsNonOwner = () => {
    localStorage.setItem('playerId_ABC123', '2');
    localStorage.setItem('isOwner_ABC123', 'false');

    return render(
      <BrowserRouter>
        <GamePage />
      </BrowserRouter>
    );
  };

  it('should display reset button for room owner', () => {
    renderGamePageAsOwner();

    expect(screen.getByText(/대기실로 돌아가기/)).toBeInTheDocument();
    expect(screen.getByText(/게임을 종료하고 모든 플레이어를 대기실로 돌려보냅니다/)).toBeInTheDocument();
  });

  it('should not display reset button for non-owner', () => {
    renderGamePageAsNonOwner();

    expect(screen.queryByText(/대기실로 돌아가기/)).not.toBeInTheDocument();
  });

  it('should call resetGame API when button is clicked', async () => {
    vi.mocked(api.resetGame).mockResolvedValue(undefined);

    renderGamePageAsOwner();

    const resetButton = screen.getByText(/대기실로 돌아가기/);
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(api.resetGame).toHaveBeenCalledWith('ABC123');
    });
  });

  it('should show loading state while resetting', async () => {
    vi.mocked(api.resetGame).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderGamePageAsOwner();

    const resetButton = screen.getByText(/대기실로 돌아가기/);
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText('초기화 중...')).toBeInTheDocument();
    });

    const button = screen.getByText('초기화 중...') as HTMLButtonElement;
    expect(button).toBeDisabled();
  });

  it('should handle reset errors gracefully', async () => {
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(api.resetGame).mockRejectedValue(new Error('Reset failed'));

    renderGamePageAsOwner();

    const resetButton = screen.getByText(/대기실로 돌아가기/);
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('게임 초기화에 실패했습니다.');
    });

    mockAlert.mockRestore();
  });

  it('should enable button again after reset error', async () => {
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(api.resetGame).mockRejectedValue(new Error('Reset failed'));

    renderGamePageAsOwner();

    const resetButton = screen.getByText(/대기실로 돌아가기/) as HTMLButtonElement;
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalled();
    });

    // Button should be enabled again after error
    await waitFor(() => {
      expect(resetButton).not.toBeDisabled();
    });

    mockAlert.mockRestore();
  });

  it('should have correct button styling', () => {
    renderGamePageAsOwner();

    const resetButton = screen.getByText(/대기실로 돌아가기/);

    expect(resetButton).toHaveStyle({
      cursor: 'pointer',
    });
  });

  it('should navigate to lobby after successful reset via WebSocket', async () => {
    vi.mocked(api.resetGame).mockResolvedValue(undefined);

    const { rerender } = renderGamePageAsOwner();

    // Simulate GAME_RESET WebSocket message
    mockLastMessage = {
      type: 'GAME_RESET',
      payload: {},
    };

    rerender(
      <BrowserRouter>
        <GamePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/lobby/ABC123');
    });
  });
});
