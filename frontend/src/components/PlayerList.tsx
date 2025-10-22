// T059: Create PlayerList component showing all players in room
import type { Player } from '../types/game.types';

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
}

export function PlayerList({ players, currentPlayerId }: PlayerListProps) {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1rem',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>
        플레이어 목록 ({players.length}명)
      </h3>

      {players.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center' }}>
          아직 플레이어가 없습니다
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {players.map((player) => (
            <li
              key={player.id}
              style={{
                padding: '0.75rem',
                marginBottom: '0.5rem',
                backgroundColor:
                  player.id === currentPlayerId ? '#e3f2fd' : '#f5f5f5',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span
                  style={{
                    fontWeight: player.id === currentPlayerId ? 'bold' : 'normal',
                  }}
                >
                  {player.nickname}
                  {player.id === currentPlayerId && ' (나)'}
                </span>
                {player.isAnonymous && (
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.8rem',
                      color: '#999',
                    }}
                  >
                    (익명)
                  </span>
                )}
              </div>

              {player.isOwner && (
                <span
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.8rem',
                    backgroundColor: '#ffc107',
                    color: '#000',
                    borderRadius: '4px',
                  }}
                >
                  방장
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
