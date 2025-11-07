import type { RoomListItem as RoomListItemType } from '../../types/game.types';

interface RoomListItemProps {
  room: RoomListItemType;
  onJoin: (roomCode: string) => void;
}

/**
 * Helper function to calculate time ago in Korean
 */
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return '방금 전';
  } else if (diffMins < 60) {
    return `${diffMins}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else {
    return `${diffDays}일 전`;
  }
}

/**
 * Get status display info with color and label
 */
function getStatusInfo(room: RoomListItemType): { color: string; dot: string; label: string } {
  const isFull = room.currentPlayers >= room.maxPlayers;
  const isWaiting = room.status === 'WAITING';
  const isInProgress = room.status === 'IN_PROGRESS';

  if (isFull) {
    return { color: '#c82333', dot: '🔴', label: '가득참' }; // Darker red for better contrast
  } else if (isWaiting) {
    return { color: '#1e7e34', dot: '🟢', label: '대기 중' }; // Darker green for better contrast
  } else if (isInProgress) {
    return { color: '#d39e00', dot: '🟡', label: '게임 중' }; // Darker yellow for better contrast (was #ffc107)
  } else {
    return { color: '#495057', dot: '⚫', label: '종료' }; // Darker gray for better contrast
  }
}

export function RoomListItem({ room, onJoin }: RoomListItemProps) {
  const statusInfo = getStatusInfo(room);
  const isFull = room.currentPlayers >= room.maxPlayers;
  const isJoinable = room.status === 'WAITING' && !isFull;

  const handleJoinClick = () => {
    if (isJoinable) {
      onJoin(room.code);
    }
  };

  return (
    <div
      style={{
        border: '1px solid var(--border-color, #ddd)',
        borderRadius: '8px',
        padding: 'clamp(0.625rem, 2vw, 0.875rem)',
        backgroundColor: 'var(--bg-card, #fff)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(0.5rem, 1.5vw, 0.625rem)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: isJoinable ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (isJoinable) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 'clamp(1.1rem, 3vw, 1.35rem)',
            fontWeight: 'bold',
            color: 'var(--text-primary, #333)',
            letterSpacing: '0.08em',
          }}
        >
          {room.code}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>{statusInfo.dot}</span>
          <span
            style={{
              fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
              color: statusInfo.color,
              fontWeight: '500',
            }}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        {room.hostNickname && (
          <div
            style={{
              fontSize: 'clamp(0.7rem, 2vw, 0.8rem)',
              color: 'var(--text-secondary, #666)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            방장: {room.hostNickname}
          </div>
        )}
        <div
          style={{
            fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
            color: 'var(--text-primary, #333)',
            fontWeight: '500',
            flexShrink: 0,
          }}
        >
          {room.currentPlayers}/{room.maxPlayers}명
        </div>
        <div
          style={{
            fontSize: 'clamp(0.7rem, 2vw, 0.8rem)',
            color: 'var(--text-secondary, #6c757d)',
            flexShrink: 0,
          }}
        >
          {getTimeAgo(room.createdAt)}
        </div>
      </div>

      <button
        onClick={handleJoinClick}
        disabled={!isJoinable}
        style={{
          padding: 'clamp(0.5rem, 2vw, 0.625rem)',
          fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
          fontWeight: '500',
          backgroundColor: isJoinable ? '#28a745' : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isJoinable ? 'pointer' : 'not-allowed',
          opacity: isJoinable ? 1 : 0.6,
          transition: 'background-color 0.2s ease, opacity 0.2s ease',
          minHeight: '40px',
          width: '100%',
        }}
        onMouseEnter={(e) => {
          if (isJoinable) {
            e.currentTarget.style.backgroundColor = '#218838';
          }
        }}
        onMouseLeave={(e) => {
          if (isJoinable) {
            e.currentTarget.style.backgroundColor = '#28a745';
          }
        }}
      >
        {isJoinable ? '참가' : isFull ? '가득참' : '참가 불가'}
      </button>
    </div>
  );
}
