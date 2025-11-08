import type { Role, TeamColor, RoomColor } from '../../types/game.types';

interface RoleCardProps {
  role: Role;
  team: TeamColor;
  currentRoom: RoomColor;
}

// T082: Create RoleCard component showing player's role and team
export function RoleCard({ role, team, currentRoom }: RoleCardProps) {
  // 스파이는 반대 팀 색상을 사용 (적 팀에 잠입했으므로)
  const displayTeam = role.isSpy
    ? (team === 'RED' ? 'BLUE' : team === 'BLUE' ? 'RED' : team)
    : team;
  const teamColor = displayTeam === 'RED' ? '#dc2626' : displayTeam === 'BLUE' ? '#2563eb' : '#6b7280';
  const roomName = currentRoom === 'RED_ROOM' ? '빨간 방' : '파란 방';
  const roomColor = currentRoom === 'RED_ROOM' ? '#dc2626' : '#2563eb';

  return (
    <div
      style={{
        border: `3px solid ${teamColor}`,
        borderRadius: '8px',
        padding: '1.5rem',
        backgroundColor: 'var(--bg-card)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: teamColor, fontWeight: 'bold' }}>당신의 역할</h2>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '1.5rem',
            color: 'var(--text-primary)',
            fontWeight: 'bold',
          }}
        >
          {role.nameKo || role.name}
        </h3>
        <p style={{ color: teamColor, fontWeight: 'bold', margin: '0.5rem 0', fontSize: '1.1rem' }}>
          {displayTeam === 'RED' ? '레드 팀' : displayTeam === 'BLUE' ? '블루 팀' : '그레이 팀'}
          {role.isSpy && (
            <span
              style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}
            >
              (실제: {team === 'RED' ? '레드 팀' : team === 'BLUE' ? '블루 팀' : '그레이 팀'})
            </span>
          )}
        </p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
          {role.descriptionKo || role.description}
        </p>
      </div>

      <div
        style={{
          padding: '0.75rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '4px',
          border: `3px solid ${roomColor}`,
        }}
      >
        <p style={{ margin: 0, fontWeight: 'bold', color: roomColor, fontSize: '1.2rem' }}>
          📍 현재 위치: <span style={{ color: 'var(--text-primary)' }}>{roomName}</span>
        </p>
      </div>

      {role.isLeader && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fbbf24',
            borderRadius: '4px',
            textAlign: 'center',
            border: '3px solid #b45309',
          }}
        >
          <span style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '1.2rem' }}>👑 리더</span>
        </div>
      )}

      {role.isSpy && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#a78bfa',
            borderRadius: '4px',
            textAlign: 'center',
            border: '3px solid #6d28d9',
          }}
        >
          <span style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '1.2rem' }}>
            🕵️ 스파이
          </span>
        </div>
      )}
    </div>
  );
}
