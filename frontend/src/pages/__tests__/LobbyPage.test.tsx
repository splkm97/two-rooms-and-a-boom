import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LobbyPage } from '../LobbyPage';
import * as api from '../../services/api';

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
vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    lastMessage: null,
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
    vi.mocked(api.getRoom).mockResolvedValue(mockRoom);
    vi.mocked(api.joinRoom).mockResolvedValue(mockPlayer);
  });

  const renderLobbyPage = () => {
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

    renderLobbyPage();
    window.history.pushState({}, '', '/lobby/ABC123');

    expect(screen.getByText(/로딩 중.../)).toBeInTheDocument();
  });

  it('should display room code and player list after loading', async () => {
    renderLobbyPage();
    window.history.pushState({}, '', '/lobby/ABC123');

    await waitFor(() => {
      expect(screen.queryByText(/로딩 중.../)).not.toBeInTheDocument();
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

    renderLobbyPage();
    window.history.pushState({}, '', '/lobby/INVALID');

    await waitFor(() => {
      expect(screen.getByText(/방을 찾을 수 없습니다/)).toBeInTheDocument();
    });
  });

  it('should show error when game already in progress', async () => {
    const inProgressRoom = { ...mockRoom, status: 'IN_PROGRESS' };
    vi.mocked(api.getRoom).mockResolvedValue(inProgressRoom);

    renderLobbyPage();
    window.history.pushState({}, '', '/lobby/ABC123');

    await waitFor(() => {
      expect(screen.getByText(/이미 게임이 시작된 방입니다/)).toBeInTheDocument();
    });
  });

  it('should join room on initial load', async () => {
    renderLobbyPage();
    window.history.pushState({}, '', '/lobby/ABC123');

    await waitFor(() => {
      expect(api.joinRoom).toHaveBeenCalledWith('ABC123');
    });
  });

  it('should store player ID in localStorage', async () => {
    renderLobbyPage();
    window.history.pushState({}, '', '/lobby/ABC123');

    await waitFor(() => {
      expect(localStorage.getItem('playerId_ABC123')).toBe('1');
      expect(localStorage.getItem('isOwner_ABC123')).toBe('true');
    });
  });

  it('should display player count', async () => {
    renderLobbyPage();
    window.history.pushState({}, '', '/lobby/ABC123');

    await waitFor(() => {
      expect(screen.getByText(/플레이어 목록 \(2명\)/)).toBeInTheDocument();
    });
  });

  it('should show owner badge for room owner', async () => {
    renderLobbyPage();
    window.history.pushState({}, '', '/lobby/ABC123');

    await waitFor(() => {
      expect(screen.getByText('방장')).toBeInTheDocument();
    });
  });
});
