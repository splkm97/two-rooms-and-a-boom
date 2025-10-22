import type { Player } from '../types/game.types';

interface RoomPlayerListProps {
  players: Player[];
  roomColor: 'RED_ROOM' | 'BLUE_ROOM';
  currentPlayerId?: string;
}

// T083: Create RoomPlayerList component showing same-room players
export function RoomPlayerList({ players, roomColor, currentPlayerId }: RoomPlayerListProps) {
  const roomName = roomColor === 'RED_ROOM' ? '빨간 방' : '파란 방';
  const roomBgColor = roomColor === 'RED_ROOM' ? '#fee2e2' : '#dbeafe';
  const roomBorderColor = roomColor === 'RED_ROOM' ? '#ef4444' : '#3b82f6';

  return (
    <div
      style={{
        border: `2px solid ${roomBorderColor}`,
        borderRadius: '8px',
        padding: '1rem',
        backgroundColor: roomBgColor,
      }}
    >
      <h3 style={{ margin: '0 0 1rem 0' }}>
        {roomName} ({players.length}명)
      </h3>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {players.map((player) => (
          <li
            key={player.id}
            style={{
              padding: '0.5rem',
              marginBottom: '0.5rem',
              backgroundColor: '#fff',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {player.nickname}
              {player.id === currentPlayerId && (
                <span style={{ marginLeft: '0.5rem', color: '#666' }}>(나)</span>
              )}
            </span>
            {player.isOwner && (
              <span
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#fbbf24',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                }}
              >
                방장
              </span>
            )}
          </li>
        ))}
      </ul>

      {players.length === 0 && (
        <p style={{ color: '#666', textAlign: 'center', margin: 0 }}>
          이 방에는 아직 플레이어가 없습니다
        </p>
      )}
    </div>
  );
}
