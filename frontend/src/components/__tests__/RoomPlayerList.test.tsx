import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RoomPlayerList } from '../RoomPlayerList';
import type { Player } from '../../types/game.types';

describe('RoomPlayerList', () => {
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
  ];

  it('should render red room with correct styling', () => {
    render(<RoomPlayerList players={mockPlayers} roomColor="RED_ROOM" />);

    expect(screen.getByText('빨간 방 (2명)')).toBeInTheDocument();
  });

  it('should render blue room with correct styling', () => {
    render(<RoomPlayerList players={mockPlayers} roomColor="BLUE_ROOM" />);

    expect(screen.getByText('파란 방 (2명)')).toBeInTheDocument();
  });

  it('should display all players in the room', () => {
    render(<RoomPlayerList players={mockPlayers} roomColor="RED_ROOM" />);

    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('Player 2')).toBeInTheDocument();
  });

  it('should show owner badge for room owner', () => {
    render(<RoomPlayerList players={mockPlayers} roomColor="RED_ROOM" />);

    expect(screen.getByText('방장')).toBeInTheDocument();
  });

  it('should highlight current player', () => {
    render(
      <RoomPlayerList players={mockPlayers} roomColor="RED_ROOM" currentPlayerId="2" />
    );

    expect(screen.getByText('(나)')).toBeInTheDocument();
  });

  it('should show empty state when no players', () => {
    render(<RoomPlayerList players={[]} roomColor="RED_ROOM" />);

    expect(screen.getByText('빨간 방 (0명)')).toBeInTheDocument();
    expect(screen.getByText('이 방에는 아직 플레이어가 없습니다')).toBeInTheDocument();
  });

  it('should display correct player count', () => {
    const singlePlayer: Player[] = [
      {
        id: '1',
        nickname: 'Solo Player',
        isOwner: true,
        isAnonymous: false,
        isConnected: true,
      },
    ];

    render(<RoomPlayerList players={singlePlayer} roomColor="BLUE_ROOM" />);

    expect(screen.getByText('파란 방 (1명)')).toBeInTheDocument();
  });

  it('should render many players', () => {
    const manyPlayers: Player[] = Array.from({ length: 5 }, (_, i) => ({
      id: `${i + 1}`,
      nickname: `Player ${i + 1}`,
      isOwner: i === 0,
      isAnonymous: false,
      isConnected: true,
    }));

    render(<RoomPlayerList players={manyPlayers} roomColor="RED_ROOM" />);

    expect(screen.getByText('빨간 방 (5명)')).toBeInTheDocument();
    manyPlayers.forEach((player) => {
      expect(screen.getByText(player.nickname)).toBeInTheDocument();
    });
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
      {
        id: '2',
        nickname: 'Player 2',
        isOwner: false,
        isAnonymous: false,
        isConnected: true,
      },
    ];

    render(<RoomPlayerList players={nonOwnerPlayers} roomColor="BLUE_ROOM" />);

    expect(screen.queryByText('방장')).not.toBeInTheDocument();
  });

  it('should show current player marker only for matching ID', () => {
    render(
      <RoomPlayerList players={mockPlayers} roomColor="RED_ROOM" currentPlayerId="1" />
    );

    const playerOneElement = screen.getByText('Player 1').closest('li');
    const playerTwoElement = screen.getByText('Player 2').closest('li');

    expect(playerOneElement).toHaveTextContent('(나)');
    expect(playerTwoElement).not.toHaveTextContent('(나)');
  });
});
