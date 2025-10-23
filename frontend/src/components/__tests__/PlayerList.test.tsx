import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlayerList } from '../PlayerList';
import type { Player } from '../../types/game.types';

describe('PlayerList', () => {
  const mockPlayers: Player[] = [
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
    {
      id: '3',
      nickname: 'Anonymous User',
      isOwner: false,
      isAnonymous: true,
      isConnected: true,
    },
  ];

  it('should render player count', () => {
    render(<PlayerList players={mockPlayers} />);

    expect(screen.getByText('플레이어 목록 (3명)')).toBeInTheDocument();
  });

  it('should render all players', () => {
    render(<PlayerList players={mockPlayers} />);

    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('Player 2')).toBeInTheDocument();
    expect(screen.getByText('Anonymous User')).toBeInTheDocument();
  });

  it('should show owner badge for room owner', () => {
    render(<PlayerList players={mockPlayers} />);

    expect(screen.getByText('방장')).toBeInTheDocument();
  });

  it('should show anonymous label for anonymous players', () => {
    render(<PlayerList players={mockPlayers} />);

    expect(screen.getByText('(익명)')).toBeInTheDocument();
  });

  it('should highlight current player', () => {
    render(<PlayerList players={mockPlayers} currentPlayerId="2" />);

    expect(screen.getByText(/Player 2/)).toBeInTheDocument();
    expect(screen.getByText('(나)')).toBeInTheDocument();
  });

  it('should show empty state when no players', () => {
    render(<PlayerList players={[]} />);

    expect(screen.getByText('플레이어 목록 (0명)')).toBeInTheDocument();
    expect(screen.getByText('아직 플레이어가 없습니다')).toBeInTheDocument();
  });

  it('should render single player', () => {
    const singlePlayer: Player[] = [
      {
        id: '1',
        nickname: 'Solo Player',
        isOwner: true,
        isAnonymous: false,
        isConnected: true,
      },
    ];

    render(<PlayerList players={singlePlayer} />);

    expect(screen.getByText('플레이어 목록 (1명)')).toBeInTheDocument();
    expect(screen.getByText('Solo Player')).toBeInTheDocument();
  });

  it('should not show owner badge for non-owner players', () => {
    const nonOwnerPlayers: Player[] = [
      {
        id: '1',
        nickname: 'Player 1',
        isOwner: false,
        isAnonymous: false,
        isConnected: true,
      },
    ];

    render(<PlayerList players={nonOwnerPlayers} />);

    expect(screen.queryByText('방장')).not.toBeInTheDocument();
  });
});
