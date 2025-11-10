import type { Player, TeamColor } from '../../types/game.types';

interface RevealPageProps {
  players: Player[];
  roomCode: string;
}

/**
 * RevealPage - Final game reveal showing all players and their roles
 *
 * Features:
 * - Shows all players grouped by room color (Red Room/Blue Room)
 * - Displays each player's role and team
 * - Shows which team won (if President is in Blue Room or Bomber in Red Room)
 * - Highlights special roles (President, Bomber)
 */
export function RevealPage({ players, roomCode }: RevealPageProps) {
  // Group players by room color
  const redRoomPlayers = players.filter((p) => p.currentRoom === 'RED_ROOM');
  const blueRoomPlayers = players.filter((p) => p.currentRoom === 'BLUE_ROOM');

  // Determine winner
  const getWinner = (): { team: TeamColor | null; reason: string } => {
    // Find President and Bomber
    const president = players.find((p) => p.role?.id === 'president');
    const bomber = players.find((p) => p.role?.id === 'bomber');

    if (!president || !bomber) {
      return { team: null, reason: '승자를 결정할 수 없습니다' };
    }

    // Check if President is in Blue Room (Blue wins)
    if (president.currentRoom === 'BLUE_ROOM') {
      return { team: 'BLUE', reason: '대통령이 파란 방에 있습니다!' };
    }

    // Check if Bomber is in Red Room (Red wins)
    if (bomber.currentRoom === 'RED_ROOM') {
      return { team: 'RED', reason: '폭탄 테러범이 빨간 방에 있습니다!' };
    }

    // If President is in Red Room with Bomber
    if (president.currentRoom === 'RED_ROOM' && bomber.currentRoom === 'RED_ROOM') {
      return { team: 'RED', reason: '대통령과 폭탄 테러범이 같은 방에 있습니다!' };
    }

    return { team: null, reason: '승자를 결정할 수 없습니다' };
  };

  const winner = getWinner();

  const getTeamColor = (team: TeamColor) => {
    switch (team) {
      case 'RED':
        return '#dc2626';
      case 'BLUE':
        return '#2563eb';
      case 'GREY':
        return '#6b7280';
    }
  };

  const getTeamName = (team: TeamColor) => {
    switch (team) {
      case 'RED':
        return '빨간 팀';
      case 'BLUE':
        return '파란 팀';
      case 'GREY':
        return '회색 팀';
    }
  };

  const getRoomColor = (room: string) => {
    return room === 'RED_ROOM' ? '#dc2626' : '#2563eb';
  };

  const getRoomName = (room: string) => {
    return room === 'RED_ROOM' ? '빨간 방' : '파란 방';
  };

  const renderRoom = (roomPlayers: Player[], roomColor: string) => {
    if (roomPlayers.length === 0) return null;

    return (
      <div
        style={{
          marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
        }}
      >
        <h2
          style={{
            margin: '0 0 1rem 0',
            fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
            fontWeight: 'bold',
            color: getRoomColor(roomColor),
            textAlign: 'center',
          }}
        >
          {getRoomName(roomColor)} ({roomPlayers.length}명)
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: 'clamp(0.75rem, 2vw, 1rem)',
          }}
        >
          {roomPlayers.filter(Boolean).map((player) => {
            const isSpecial =
              player.role?.id === 'president' || player.role?.id === 'bomber';

            return (
              <div
                key={player.id}
                style={{
                  padding: 'clamp(1rem, 3vw, 1.25rem)',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                  border: `3px solid ${player.team ? getTeamColor(player.team) : '#6b7280'}`,
                  borderRadius: '8px',
                  boxShadow: isSpecial
                    ? `0 0 20px ${player.team ? getTeamColor(player.team) : '#6b7280'}80`
                    : '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 'clamp(1rem, 3vw, 1.1rem)',
                      fontWeight: 'bold',
                      color: 'var(--text-primary, #1f2937)',
                    }}
                  >
                    {player.nickname}
                  </h3>
                  <span
                    style={{
                      fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
                      color: '#ffffff',
                      backgroundColor: player.team ? getTeamColor(player.team) : '#6b7280',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    {player.team && getTeamName(player.team)}
                  </span>
                </div>
                <div
                  style={{
                    padding: 'clamp(0.75rem, 2vw, 1rem)',
                    backgroundColor: `${player.team ? getTeamColor(player.team) : '#6b7280'}15`,
                    borderRadius: '6px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 'clamp(0.95rem, 2.5vw, 1rem)',
                      fontWeight: 600,
                      color: player.team ? getTeamColor(player.team) : '#6b7280',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {isSpecial && '⭐ '}
                    {player.role?.nameKo || player.role?.name || '역할 없음'}
                  </div>
                  {player.role?.descriptionKo && (
                    <div
                      style={{
                        fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
                        color: 'var(--text-secondary, #6b7280)',
                        marginTop: '0.5rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {player.role?.descriptionKo}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(1rem, 3vw, 2rem)',
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 'clamp(2rem, 5vw, 3rem)',
        }}
      >
        <h1
          style={{
            margin: '0 0 1rem 0',
            fontSize: 'clamp(2rem, 6vw, 3rem)',
            fontWeight: 'bold',
            color: 'var(--text-primary, #1f2937)',
          }}
        >
          🎭 역할 공개
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
            color: 'var(--text-secondary, #6b7280)',
          }}
        >
          방 코드: {roomCode}
        </p>
      </div>

      {/* Winner announcement */}
      {winner.team && (
        <div
          style={{
            padding: 'clamp(1.5rem, 4vw, 2rem)',
            backgroundColor: `${getTeamColor(winner.team)}15`,
            border: `3px solid ${getTeamColor(winner.team)}`,
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: 'clamp(2rem, 5vw, 3rem)',
            boxShadow: `0 0 30px ${getTeamColor(winner.team)}40`,
          }}
        >
          <div
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              marginBottom: '1rem',
            }}
          >
            🏆
          </div>
          <h2
            style={{
              margin: '0 0 0.5rem 0',
              fontSize: 'clamp(1.5rem, 5vw, 2rem)',
              fontWeight: 'bold',
              color: getTeamColor(winner.team),
            }}
          >
            {getTeamName(winner.team)} 승리!
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(1rem, 3vw, 1.25rem)',
              color: 'var(--text-primary, #1f2937)',
            }}
          >
            {winner.reason}
          </p>
        </div>
      )}

      {/* Rooms */}
      {renderRoom(redRoomPlayers, 'RED_ROOM')}
      {renderRoom(blueRoomPlayers, 'BLUE_ROOM')}
    </div>
  );
}
