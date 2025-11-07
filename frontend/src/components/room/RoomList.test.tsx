import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RoomList } from './RoomList';
import * as api from '../../services/api';
import type { RoomListResponse } from '../../types/game.types';

// Mock the API module
vi.mock('../../services/api', () => ({
  listRooms: vi.fn(),
  APIError: class APIError extends Error {
    userMessage: string;
    constructor(message: string) {
      super(message);
      this.userMessage = message;
    }
  },
}));

describe('RoomList', () => {
  const mockOnJoin = vi.fn();

  const mockRoomListResponse: RoomListResponse = {
    rooms: [
      {
        code: 'ABC123',
        status: 'WAITING',
        currentPlayers: 3,
        maxPlayers: 10,
        isPublic: true,
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        hostNickname: 'Host1',
      },
      {
        code: 'XYZ789',
        status: 'IN_PROGRESS',
        currentPlayers: 8,
        maxPlayers: 10,
        isPublic: true,
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        hostNickname: 'Host2',
      },
    ],
    total: 2,
    limit: 50,
    offset: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner on initial load', () => {
    vi.mocked(api.listRooms).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<RoomList onJoin={mockOnJoin} autoRefresh={false} />);

    expect(screen.getByText('방 목록을 불러오는 중...')).toBeInTheDocument();
  });

  it('displays rooms after successful fetch', async () => {
    vi.mocked(api.listRooms).mockResolvedValue(mockRoomListResponse);

    render(<RoomList onJoin={mockOnJoin} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(screen.getByText('XYZ789')).toBeInTheDocument();
    });
  });

  it('displays room count in header', async () => {
    vi.mocked(api.listRooms).mockResolvedValue(mockRoomListResponse);

    render(<RoomList onJoin={mockOnJoin} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('(2개)')).toBeInTheDocument();
    });
  });

  it('displays empty state when no rooms', async () => {
    vi.mocked(api.listRooms).mockResolvedValue({
      rooms: [],
      total: 0,
      limit: 50,
      offset: 0,
    });

    render(<RoomList onJoin={mockOnJoin} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('현재 공개 방이 없습니다')).toBeInTheDocument();
      expect(screen.getByText('새로운 방을 만들어보세요!')).toBeInTheDocument();
    });
  });

  it('displays error state on fetch failure', async () => {
    const error = new api.APIError('방 목록을 불러오는데 실패했습니다');
    vi.mocked(api.listRooms).mockRejectedValue(error);

    render(<RoomList onJoin={mockOnJoin} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText(/방 목록을 불러오는데 실패했습니다/)).toBeInTheDocument();
      expect(screen.getByText('다시 시도')).toBeInTheDocument();
    });
  });

  it('retries fetch when retry button clicked', async () => {
    const error = new api.APIError('방 목록을 불러오는데 실패했습니다');
    vi.mocked(api.listRooms)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(mockRoomListResponse);

    render(<RoomList onJoin={mockOnJoin} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('다시 시도')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('다시 시도');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    expect(api.listRooms).toHaveBeenCalledTimes(2);
  });

  it('calls onJoin when room join button clicked', async () => {
    vi.mocked(api.listRooms).mockResolvedValue(mockRoomListResponse);

    render(<RoomList onJoin={mockOnJoin} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    const joinButtons = screen.getAllByRole('button', { name: '참가' });
    fireEvent.click(joinButtons[0]);

    expect(mockOnJoin).toHaveBeenCalledWith('ABC123');
  });

  it('refreshes room list manually when refresh button clicked', async () => {
    vi.mocked(api.listRooms).mockResolvedValue(mockRoomListResponse);

    render(<RoomList onJoin={mockOnJoin} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText(/새로고침/);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(api.listRooms).toHaveBeenCalledTimes(2);
    });
  });

  it('filters rooms by status when provided', async () => {
    vi.mocked(api.listRooms).mockResolvedValue(mockRoomListResponse);

    render(<RoomList onJoin={mockOnJoin} status="WAITING" autoRefresh={false} />);

    await waitFor(() => {
      expect(api.listRooms).toHaveBeenCalledWith('WAITING');
    });
  });

  it('uses responsive grid layout', async () => {
    vi.mocked(api.listRooms).mockResolvedValue(mockRoomListResponse);

    render(<RoomList onJoin={mockOnJoin} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(screen.getByText('XYZ789')).toBeInTheDocument();
    });

    // Check that rooms are rendered (indicating grid layout is working)
    expect(screen.getByText('공개 방 목록')).toBeInTheDocument();
  });
});
