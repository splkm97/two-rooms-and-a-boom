import type { Role, TeamColor, RoomColor } from '../types/game.types';

interface RoleCardProps {
  role: Role;
  team: TeamColor;
  currentRoom: RoomColor;
}

// T082: Create RoleCard component showing player's role and team
export function RoleCard({ role, team, currentRoom }: RoleCardProps) {
  const teamColor = team === 'RED' ? '#ef4444' : '#3b82f6';
  const roomName = currentRoom === 'RED_ROOM' ? '빨간 방' : '파란 방';

  return (
    <div
      style={{
        border: `3px solid ${teamColor}`,
        borderRadius: '8px',
        padding: '1.5rem',
        backgroundColor: '#fff',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: teamColor }}>당신의 역할</h2>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{role.name}</h3>
        <p style={{ color: teamColor, fontWeight: 'bold', margin: '0.5rem 0' }}>
          {team === 'RED' ? '레드 팀' : '블루 팀'}
        </p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ margin: 0, color: '#666' }}>{role.description}</p>
      </div>

      <div
        style={{
          padding: '0.75rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
        }}
      >
        <p style={{ margin: 0, fontWeight: 'bold' }}>
          현재 위치: {roomName}
        </p>
      </div>

      {role.isLeader && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.5rem',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontWeight: 'bold', color: '#92400e' }}>
            👑 리더
          </span>
        </div>
      )}

      {role.isSpy && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.5rem',
            backgroundColor: '#ddd6fe',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontWeight: 'bold', color: '#5b21b6' }}>
            🕵️ 스파이
          </span>
        </div>
      )}
    </div>
  );
}
