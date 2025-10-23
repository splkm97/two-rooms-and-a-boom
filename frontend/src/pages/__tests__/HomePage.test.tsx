import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from '../HomePage';
import * as api from '../../services/api';

// Mock the API module
vi.mock('../../services/api', () => ({
  createRoom: vi.fn(),
  APIError: class APIError extends Error {
    userMessage: string;
    constructor(message: string, userMessage: string) {
      super(message);
      this.userMessage = userMessage;
    }
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderHomePage = () => {
    return render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );
  };

  it('should render the home page with title and buttons', () => {
    renderHomePage();

    expect(screen.getByText('두개의 방, 한개의 폭탄')).toBeInTheDocument();
    expect(screen.getByText('역할 배분 시스템에 오신 것을 환영합니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '방 만들기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '방 참가' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('방 코드 입력 (6자리)')).toBeInTheDocument();
  });

  it('should create a room and navigate to lobby on button click', async () => {
    const mockRoom = { code: 'ABC123', status: 'WAITING', players: [], ownerId: '1' };
    vi.mocked(api.createRoom).mockResolvedValue(mockRoom);

    renderHomePage();

    const createButton = screen.getByRole('button', { name: '방 만들기' });
    fireEvent.click(createButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('생성 중...')).toBeInTheDocument();
    });

    // Should call API and navigate
    await waitFor(() => {
      expect(api.createRoom).toHaveBeenCalledWith(10);
      expect(mockNavigate).toHaveBeenCalledWith('/lobby/ABC123');
    });
  });

  it('should display error message when room creation fails', async () => {
    const mockError = new api.APIError('Failed', '방 생성에 실패했습니다');
    vi.mocked(api.createRoom).mockRejectedValue(mockError);

    renderHomePage();

    const createButton = screen.getByRole('button', { name: '방 만들기' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('방 생성에 실패했습니다')).toBeInTheDocument();
    });
  });

  it('should join a room when valid room code is entered', async () => {
    renderHomePage();

    const input = screen.getByPlaceholderText('방 코드 입력 (6자리)');
    const joinButton = screen.getByRole('button', { name: '방 참가' });

    fireEvent.change(input, { target: { value: 'abc123' } });
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/lobby/ABC123');
    });
  });

  it('should show error when room code is invalid', async () => {
    renderHomePage();

    const input = screen.getByPlaceholderText('방 코드 입력 (6자리)');
    const joinButton = screen.getByRole('button', { name: '방 참가' });

    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(screen.getByText('방 코드는 6자리여야 합니다')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should convert room code to uppercase', () => {
    renderHomePage();

    const input = screen.getByPlaceholderText('방 코드 입력 (6자리)') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'abc123' } });

    expect(input.value).toBe('ABC123');
  });

  it('should disable create button while creating', async () => {
    vi.mocked(api.createRoom).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderHomePage();

    const createButton = screen.getByRole('button', { name: '방 만들기' }) as HTMLButtonElement;
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createButton).toBeDisabled();
    });
  });
});
