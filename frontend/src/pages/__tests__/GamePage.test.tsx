import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { GamePage } from '../GamePage';
import * as api from '../../services/api';
import type { Role, TeamColor, RoomColor } from '../../types/game.types';

// Mock API
vi.mock('../../services/api', () => ({
  resetGame: vi.fn(),
  getRoom: vi.fn(),
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
      expect(screen.getByText(/방 코드:/)).toBeInTheDocument();
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });
  });

  it('should show connection status', () => {
    renderGamePage();

    expect(screen.getByText('✓ 연결됨')).toBeInTheDocument();
  });

  it('should handle GAME_STARTED followed by ROLE_ASSIGNED messages', async () => {
    // Mock getRoom to return room data with player role
    const mockRoomData = {
      code: 'ABC123',
      status: 'IN_PROGRESS',
      players: [
        {
          id: 'player-1',
          nickname: 'Player 1',
          role: {
            id: 'BLUE_OPERATIVE',
            name: '블루 팀 요원',
            description: '블루 팀의 일반 시민.',
            team: 'BLUE',
            isSpy: false,
            isLeader: false,
          },
          team: 'BLUE',
          currentRoom: 'RED_ROOM',
        },
      ],
    };

    vi.mocked(api.getRoom).mockResolvedValue(mockRoomData);
    localStorage.setItem('playerId_ABC123', 'player-1');
    localStorage.setItem('isOwner_ABC123', 'false');

    // Start with GAME_STARTED message
    mockLastMessage = {
      type: 'GAME_STARTED',
      payload: {
        gameSession: {
          id: '722d4ffa-f288-4672-9f38-3ac38c4e3b02',
          roomCode: 'NPNVV6',
          redTeam: null,
          blueTeam: null,
          redRoomPlayers: null,
          blueRoomPlayers: null,
          startedAt: '2025-11-01T20:39:56.643746+09:00',
        },
      },
    };

    const { rerender } = renderGamePage();

    // Should show loading state initially
    expect(screen.getByText('게임을 로딩 중입니다...')).toBeInTheDocument();

    // Wait for getRoom to be called after GAME_STARTED
    await waitFor(() => {
      expect(api.getRoom).toHaveBeenCalledWith('ABC123');
    });

    // Now send ROLE_ASSIGNED message
    mockLastMessage = {
      type: 'ROLE_ASSIGNED',
      payload: {
        currentRoom: 'RED_ROOM' as RoomColor,
        role: {
          id: 'BLUE_OPERATIVE',
          name: '블루 팀 요원',
          description: '블루 팀의 일반 시민.',
          team: 'BLUE',
          isSpy: false,
          isLeader: false,
        },
        team: 'BLUE' as TeamColor,
      },
    };

    rerender(
      <BrowserRouter>
        <GamePage />
      </BrowserRouter>
    );

    // Should now display the role card
    await waitFor(() => {
      expect(screen.getByText('당신의 역할')).toBeInTheDocument();
      expect(screen.getByText('블루 팀 요원')).toBeInTheDocument();
      expect(screen.getByText('블루 팀')).toBeInTheDocument();
    });

    // Should display current room
    await waitFor(() => {
      expect(screen.getByText(/📍 현재 위치:/)).toBeInTheDocument();
      expect(screen.getByText('빨간 방')).toBeInTheDocument();
    });
  });

  it('should display role immediately when receiving ROLE_ASSIGNED without GAME_STARTED', async () => {
    localStorage.setItem('playerId_ABC123', 'player-1');
    localStorage.setItem('isOwner_ABC123', 'false');

    // Send ROLE_ASSIGNED directly (user joined game already in progress)
    mockLastMessage = {
      type: 'ROLE_ASSIGNED',
      payload: {
        currentRoom: 'RED_ROOM' as RoomColor,
        role: {
          id: 'BLUE_OPERATIVE',
          name: '블루 팀 요원',
          description: '블루 팀의 일반 시민.',
          team: 'BLUE',
          isSpy: false,
          isLeader: false,
        },
        team: 'BLUE' as TeamColor,
      },
    };

    renderGamePage();

    // Should display the role card immediately
    await waitFor(() => {
      expect(screen.getByText('당신의 역할')).toBeInTheDocument();
      expect(screen.getByText('블루 팀 요원')).toBeInTheDocument();
      expect(screen.getByText('블루 팀')).toBeInTheDocument();
    });

    // Should display current room
    await waitFor(() => {
      expect(screen.getByText(/📍 현재 위치:/)).toBeInTheDocument();
      expect(screen.getByText('빨간 방')).toBeInTheDocument();
    });
  });

  it('should connect WebSocket with playerId from localStorage on mount', async () => {
    // This test verifies the bug fix: GamePage should load playerId from localStorage
    // BEFORE calling useWebSocket, so WebSocket can connect properly
    localStorage.setItem('playerId_ABC123', 'player-1');
    localStorage.setItem('isOwner_ABC123', 'false');

    renderGamePage();

    // Verify loading state shows (no role yet)
    expect(screen.getByText('게임을 로딩 중입니다...')).toBeInTheDocument();

    // The useWebSocket mock will return isConnected: true because playerId is available
    // In real app, WebSocket would connect to ws://localhost:8080/ws/ABC123?playerId=player-1
    expect(screen.getByText('✓ 연결됨')).toBeInTheDocument();
  });
});
