import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { GamePage } from '../GamePage';
import * as api from '../../services/api';
import type { Role, TeamColor, RoomColor } from '../../types/game.types';

// Mock API
vi.mock('../../services/api', () => ({
  resetGame: vi.fn(),
}));

// Mock useWebSocket hook
const mockSendMessage = vi.fn();
let mockLastMessage: any = null;

vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    lastMessage: mockLastMessage,
    sendMessage: mockSendMessage,
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

describe('GamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLastMessage = null;
    localStorage.clear();
  });

  const renderGamePage = () => {
    return render(
      <BrowserRouter>
        <GamePage />
      </BrowserRouter>
    );
  };

  it('should show loading state when role not assigned', () => {
    renderGamePage();

    expect(screen.getByText('게임을 로딩 중입니다...')).toBeInTheDocument();
    expect(screen.getByText('역할 배정을 기다리고 있습니다.')).toBeInTheDocument();
  });

  it('should display role card when role is assigned', async () => {
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

    renderGamePage();

    await waitFor(() => {
      expect(screen.getByText('당신의 역할')).toBeInTheDocument();
      expect(screen.getByText('대통령')).toBeInTheDocument();
      expect(screen.getByText('블루 팀')).toBeInTheDocument();
    });
  });

  it('should show reset button for room owner', () => {
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

    localStorage.setItem('playerId_ABC123', '1');
    localStorage.setItem('isOwner_ABC123', 'true');

    renderGamePage();

    expect(screen.getByText(/대기실로 돌아가기/)).toBeInTheDocument();
  });

  it('should not show reset button for non-owner', () => {
    const mockRole: Role = {
      id: 'operative',
      name: '요원',
      description: '블루 팀 요원입니다',
      team: 'BLUE',
      isLeader: false,
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

    localStorage.setItem('playerId_ABC123', '2');
    localStorage.setItem('isOwner_ABC123', 'false');

    renderGamePage();

    expect(screen.queryByText(/대기실로 돌아가기/)).not.toBeInTheDocument();
  });

  it('should call resetGame API when reset button clicked', async () => {
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

    localStorage.setItem('playerId_ABC123', '1');
    localStorage.setItem('isOwner_ABC123', 'true');

    vi.mocked(api.resetGame).mockResolvedValue(undefined);

    renderGamePage();

    const resetButton = screen.getByText(/대기실로 돌아가기/);
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(api.resetGame).toHaveBeenCalledWith('ABC123');
    });
  });

  it('should navigate to lobby on GAME_RESET message', async () => {
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

    const { rerender } = renderGamePage();

    // Simulate GAME_RESET message
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

  it('should display room code', async () => {
    const mockRole: Role = {
      id: 'operative',
      name: '요원',
      description: '블루 팀 요원입니다',
      team: 'BLUE',
      isLeader: false,
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

    renderGamePage();

    await waitFor(() => {
      expect(screen.getByText(/방 코드: ABC123/)).toBeInTheDocument();
    });
  });

  it('should show connection status', () => {
    renderGamePage();

    expect(screen.getByText('✓ 연결됨')).toBeInTheDocument();
  });
});
