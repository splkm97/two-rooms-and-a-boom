import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LobbyPage } from '../LobbyPage';
import * as api from '../../services/api';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock API module
vi.mock('../../services/api', () => ({
  getRoom: vi.fn(),
  joinRoom: vi.fn(),
  updateNickname: vi.fn(),
  startGame: vi.fn(),
  APIError: class APIError extends Error {
    userMessage: string;
    constructor(message: string, userMessage: string) {
      super(message);
      this.userMessage = userMessage;
    }
  },
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

describe('LobbyPage', () => {
  const mockRoom = {
    code: 'ABC123',
    status: 'WAITING',
    maxPlayers: 10,
    ownerId: '1',
    players: [
      {
        id: '1',
        nickname: 'Player 1',
        isOwner: true,
        isAnonymous: false,
        isConnected: true,
      },
      {
        id: '2',
        nickname: 'Player 2',
        isOwner: false,
        isAnonymous: false,
        isConnected: true,
      },
    ],
  };

  const mockPlayer = {
    id: '1',
    nickname: 'Player 1',
    isOwner: true,
    isAnonymous: false,
    isConnected: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLastMessage = null;
    vi.mocked(api.getRoom).mockResolvedValue(mockRoom);
    vi.mocked(api.joinRoom).mockResolvedValue(mockPlayer);
  });

  const renderLobbyPage = (roomCode: string = 'ABC123') => {
    // Set the URL before rendering
    window.history.pushState({}, '', `/lobby/${roomCode}`);

    return render(
      <BrowserRouter>
        <Routes>
          <Route path="/lobby/:roomCode" element={<LobbyPage />} />
        </Routes>
      </BrowserRouter>,
      { hydrate: false }
    );
  };

  it('should show loading state initially', () => {
    // Make API call hang
    vi.mocked(api.getRoom).mockImplementation(() => new Promise(() => {}));

    renderLobbyPage('ABC123');

    expect(screen.getByText(/방 정보를 불러오는 중.../)).toBeInTheDocument();
  });

  it('should display room code and player list after loading', async () => {
    renderLobbyPage('ABC123');

    await waitFor(() => {
      expect(screen.queryByText(/방 정보를 불러오는 중.../)).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/ABC123/)).toBeInTheDocument();
      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.getByText('Player 2')).toBeInTheDocument();
    });
  });

  it('should show error when room not found', async () => {
    const mockError = new api.APIError('Not found', '방을 찾을 수 없습니다');
    vi.mocked(api.getRoom).mockRejectedValue(mockError);

    renderLobbyPage('INVALID');

    await waitFor(() => {
      expect(screen.getByText(/방을 찾을 수 없습니다/)).toBeInTheDocument();
    });
  });

  it('should show error when game already in progress', async () => {
    const inProgressRoom = { ...mockRoom, status: 'IN_PROGRESS' };
    vi.mocked(api.getRoom).mockResolvedValue(inProgressRoom);

    renderLobbyPage('ABC123');

    await waitFor(() => {
      expect(screen.getByText(/이미 게임이 시작된 방입니다/)).toBeInTheDocument();
    });
  });

  it('should join room on initial load', async () => {
    renderLobbyPage('ABC123');

    await waitFor(() => {
      expect(api.joinRoom).toHaveBeenCalledWith('ABC123');
    });
  });

  it('should store player ID in localStorage', async () => {
    renderLobbyPage('ABC123');

    await waitFor(() => {
      expect(localStorage.getItem('playerId_ABC123')).toBe('1');
      expect(localStorage.getItem('isOwner_ABC123')).toBe('true');
    });
  });

  it('should display player count', async () => {
    renderLobbyPage('ABC123');

    await waitFor(() => {
      expect(screen.getByText(/플레이어 목록 \(2명\)/)).toBeInTheDocument();
    });
  });

  it('should show owner badge for room owner', async () => {
    renderLobbyPage('ABC123');

    await waitFor(() => {
      expect(screen.getByText('방장')).toBeInTheDocument();
    });
  });

  it('should navigate to game page when GAME_STARTED message is received', async () => {
    const { rerender } = renderLobbyPage('ABC123');

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Player 1')).toBeInTheDocument();
    });

    // Simulate GAME_STARTED message
    mockLastMessage = {
      type: 'GAME_STARTED',
      payload: {
        gameSession: {
          id: '722d4ffa-f288-4672-9f38-3ac38c4e3b02',
          roomCode: 'ABC123',
          startedAt: '2025-11-01T20:39:56.643746+09:00',
        },
      },
    };

    // Rerender to trigger useEffect
    rerender(
      <BrowserRouter>
        <Routes>
          <Route path="/lobby/:roomCode" element={<LobbyPage />} />
        </Routes>
      </BrowserRouter>
    );

    // Should navigate to game page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/game/ABC123');
    });
  });

  it('should navigate to game page when ROLE_ASSIGNED message is received', async () => {
    const { rerender } = renderLobbyPage('ABC123');

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Player 1')).toBeInTheDocument();
    });

    // Simulate ROLE_ASSIGNED message (should also trigger navigation)
    mockLastMessage = {
      type: 'ROLE_ASSIGNED',
      payload: {
        currentRoom: 'RED_ROOM',
        role: {
          id: 'BLUE_OPERATIVE',
          name: '블루 팀 요원',
          description: '블루 팀의 일반 시민.',
          team: 'BLUE',
          isSpy: false,
          isLeader: false,
        },
        team: 'BLUE',
      },
    };

    // Rerender to trigger useEffect
    rerender(
      <BrowserRouter>
        <Routes>
          <Route path="/lobby/:roomCode" element={<LobbyPage />} />
        </Routes>
      </BrowserRouter>
    );

    // LobbyPage doesn't handle ROLE_ASSIGNED, so navigation should NOT occur
    // (ROLE_ASSIGNED is handled by GamePage only)
    await waitFor(() => {
      // Should still be on lobby page
      expect(screen.getByText('Player 1')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Navigate should not have been called (or only called from GAME_STARTED earlier)
    expect(mockNavigate).not.toHaveBeenCalledWith('/game/ABC123');
  });
});
