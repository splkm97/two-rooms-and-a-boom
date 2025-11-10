import type { Player } from '../../types/game.types';

interface RoomPlayerListProps {
  players: Player[];
  roomColor: 'RED_ROOM' | 'BLUE_ROOM';
  currentPlayerId?: string;
  leaderId?: string;
}

// T083: Create RoomPlayerList component showing same-room players
export function RoomPlayerList({ players, roomColor, currentPlayerId, leaderId }: RoomPlayerListProps) {
  const roomName = roomColor === 'RED_ROOM' ? '빨간 방' : '파란 방';
  const roomBgColor = roomColor === 'RED_ROOM' ? '#fecaca' : '#bfdbfe';
  const roomBorderColor = roomColor === 'RED_ROOM' ? '#dc2626' : '#2563eb';
  const roomTextColor = roomColor === 'RED_ROOM' ? '#991b1b' : '#1e40af';

  return (
    <div
      style={{
        border: `3px solid ${roomBorderColor}`,
        borderRadius: '8px',
        padding: '1.25rem',
        backgroundColor: roomBgColor,
      }}
    >
      <h3 style={{ margin: '0 0 1rem 0', color: roomTextColor, fontSize: '1.3rem' }}>
        {roomName} ({players.length}명)
      </h3>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {players.filter(Boolean).map((player) => (
          <li
            key={player.id}
            style={{
              padding: '0.75rem',
              marginBottom: '0.5rem',
              backgroundColor: '#fff',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border:
                player.id === currentPlayerId
                  ? `2px solid ${roomBorderColor}`
                  : '1px solid #e5e7eb',
            }}
          >
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: player.id === currentPlayerId ? 'bold' : '500',
                color: '#1f2937', // Dark gray for readability on white background
              }}
            >
              {player.nickname}
              {player.id === currentPlayerId && (
                <span style={{ marginLeft: '0.5rem', color: roomTextColor, fontWeight: 'bold' }}>
                  (나)
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {player.isOwner && (
                <span
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#fde047',
                    border: '1px solid #ca8a04',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    color: '#713f12',
                  }}
                >
                  방장
                </span>
              )}
              {leaderId && player.id === leaderId && (
                <span
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#c084fc',
                    border: '1px solid #7c3aed',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    color: '#4c1d95',
                  }}
                >
                  리더
                </span>
              )}
            </div>
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
