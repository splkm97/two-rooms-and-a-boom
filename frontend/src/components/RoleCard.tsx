import type { Role, TeamColor, RoomColor } from '../types/game.types';

interface RoleCardProps {
  role: Role;
  team: TeamColor;
  currentRoom: RoomColor;
}

// T082: Create RoleCard component showing player's role and team
export function RoleCard({ role, team, currentRoom }: RoleCardProps) {
  // 스파이는 반대 팀 색상을 사용 (적 팀에 잠입했으므로)
  const displayTeam = role.isSpy ? (team === 'RED' ? 'BLUE' : 'RED') : team;
  const teamColor = displayTeam === 'RED' ? '#dc2626' : '#2563eb';
  const teamBgColor = displayTeam === 'RED' ? '#fee2e2' : '#dbeafe';
  const roomName = currentRoom === 'RED_ROOM' ? '빨간 방' : '파란 방';
  const roomColor = currentRoom === 'RED_ROOM' ? '#dc2626' : '#2563eb';
  const roomBgColor = currentRoom === 'RED_ROOM' ? '#fecaca' : '#bfdbfe';

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
          {displayTeam === 'RED' ? '레드 팀' : '블루 팀'}
          {role.isSpy && (
            <span style={{ fontSize: '0.9rem', color: '#666', marginLeft: '0.5rem' }}>
              (실제: {team === 'RED' ? '레드 팀' : '블루 팀'})
            </span>
          )}
        </p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ margin: 0, color: '#666' }}>{role.description}</p>
      </div>

      <div
        style={{
          padding: '0.75rem',
          backgroundColor: roomBgColor,
          borderRadius: '4px',
          border: `2px solid ${roomColor}`,
        }}
      >
        <p style={{ margin: 0, fontWeight: 'bold', color: roomColor, fontSize: '1.1rem' }}>
          현재 위치: {roomName}
        </p>
      </div>

      {role.isLeader && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fde047',
            borderRadius: '4px',
            textAlign: 'center',
            border: '2px solid #ca8a04',
          }}
        >
          <span style={{ fontWeight: 'bold', color: '#713f12', fontSize: '1.1rem' }}>
            👑 리더
          </span>
        </div>
      )}

      {role.isSpy && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#c4b5fd',
            borderRadius: '4px',
            textAlign: 'center',
            border: '2px solid #7c3aed',
          }}
        >
          <span style={{ fontWeight: 'bold', color: '#4c1d95', fontSize: '1.1rem' }}>
            🕵️ 스파이
          </span>
        </div>
      )}
    </div>
  );
}
