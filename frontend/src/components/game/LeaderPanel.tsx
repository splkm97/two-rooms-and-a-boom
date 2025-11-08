import { useState } from 'react';
import type { Player, RoomColor } from '../../types/game.types';

interface LeaderPanelProps {
  isLeader: boolean;
  hostageCount: number;
  players: Player[];
  currentPlayerId: string;
  currentRoom: RoomColor;
  onSelectHostages: (hostageIds: string[]) => void;
  onTransferLeadership: () => void;
  canTransferLeadership: boolean;
  selectionLocked: boolean;
}

/**
 * LeaderPanel - Hostage selection UI for room leaders
 *
 * Allows leaders to:
 * - Select hostages to send to the other room
 * - Announce hostage selection
 * - Transfer leadership to another player
 */
export function LeaderPanel({
  isLeader,
  hostageCount,
  players,
  currentPlayerId,
  currentRoom,
  onSelectHostages,
  onTransferLeadership,
  canTransferLeadership,
  selectionLocked,
}: LeaderPanelProps) {
  const [selectedHostages, setSelectedHostages] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');

  if (!isLeader) {
    return null;
  }

  const handleToggleHostage = (playerId: string) => {
    if (selectionLocked) {
      return;
    }

    setError('');

    // Cannot select self
    if (playerId === currentPlayerId) {
      setError('리더는 자기 자신을 인질로 선택할 수 없습니다');
      return;
    }

    setSelectedHostages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        // Check if we've reached the limit
        if (newSet.size >= hostageCount) {
          setError(`최대 ${hostageCount}명까지만 선택할 수 있습니다`);
          return prev;
        }
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const handleAnnounceHostages = () => {
    if (selectedHostages.size !== hostageCount) {
      setError(`정확히 ${hostageCount}명을 선택해야 합니다`);
      return;
    }

    if (
      confirm(
        `선택한 ${selectedHostages.size}명을 ${currentRoom === 'RED_ROOM' ? '파란' : '빨간'} 방으로 보내시겠습니까?\n\n이 결정은 취소할 수 없습니다.`
      )
    ) {
      onSelectHostages(Array.from(selectedHostages));
    }
  };

  const roomName = currentRoom === 'RED_ROOM' ? '빨간 방' : '파란 방';
  const otherRoomName = currentRoom === 'RED_ROOM' ? '파란 방' : '빨간 방';
  const roomColor = currentRoom === 'RED_ROOM' ? '#dc2626' : '#2563eb';

  const canAnnounce = selectedHostages.size === hostageCount && !selectionLocked;

  return (
    <div
      style={{
        border: `3px solid ${roomColor}`,
        borderRadius: '8px',
        padding: 'clamp(1rem, 3vw, 1.5rem)',
        backgroundColor: 'var(--bg-card, #ffffff)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              color: roomColor,
              fontWeight: 'bold',
              fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
            }}
          >
            👑 당신은 리더입니다
          </h3>
          <p
            style={{
              margin: '0.25rem 0 0 0',
              fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
              color: 'var(--text-secondary, #6b7280)',
            }}
          >
            {roomName} 리더
          </p>
        </div>
        <button
          onClick={onTransferLeadership}
          disabled={!canTransferLeadership}
          style={{
            padding: 'clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 2.5vw, 1rem)',
            backgroundColor: canTransferLeadership ? '#6366f1' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
            fontWeight: 'bold',
            cursor: canTransferLeadership ? 'pointer' : 'not-allowed',
            opacity: canTransferLeadership ? 1 : 0.6,
          }}
          title={canTransferLeadership ? '리더십 이전' : '인질 선택 중에는 리더십을 이전할 수 없습니다'}
        >
          🔄 리더십 이전
        </button>
      </div>

      {/* Instructions */}
      {!selectionLocked && (
        <div
          style={{
            padding: 'clamp(0.75rem, 2vw, 1rem)',
            backgroundColor: 'var(--bg-secondary, #f3f4f6)',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
              color: 'var(--text-primary, #1f2937)',
              lineHeight: 1.5,
            }}
          >
            <strong>{hostageCount}명</strong>을 선택하여 <strong>{otherRoomName}</strong>으로 보내세요
          </p>
        </div>
      )}

      {/* Selection locked message */}
      {selectionLocked && (
        <div
          style={{
            padding: 'clamp(0.75rem, 2vw, 1rem)',
            backgroundColor: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
              color: '#92400e',
              fontWeight: 600,
            }}
          >
            ✓ 인질 선택이 완료되었습니다. 상대 리더의 선택을 기다리는 중...
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: 'clamp(0.65rem, 2vw, 0.75rem)',
            backgroundColor: '#fee2e2',
            border: '2px solid #ef4444',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
              color: '#991b1b',
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </p>
        </div>
      )}

      {/* Player selection list */}
      <div
        style={{
          marginBottom: '1rem',
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: '6px',
        }}
      >
        {players.map((player) => {
          const isSelected = selectedHostages.has(player.id);
          const isSelf = player.id === currentPlayerId;

          return (
            <label
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 'clamp(0.75rem, 2vw, 1rem)',
                borderBottom: '1px solid var(--border-color, #e5e7eb)',
                backgroundColor: isSelected ? `${roomColor}15` : 'transparent',
                cursor: isSelf || selectionLocked ? 'not-allowed' : 'pointer',
                opacity: isSelf ? 0.5 : 1,
                minHeight: '44px', // Touch-friendly
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggleHostage(player.id)}
                disabled={isSelf || selectionLocked}
                style={{
                  width: 'clamp(18px, 4vw, 20px)',
                  height: 'clamp(18px, 4vw, 20px)',
                  marginRight: 'clamp(0.5rem, 2vw, 0.75rem)',
                  cursor: isSelf || selectionLocked ? 'not-allowed' : 'pointer',
                }}
              />
              <span
                style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  color: 'var(--text-primary, #1f2937)',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {player.nickname}
                {isSelf && ' (당신)'}
                {isSelected && ' ✓'}
              </span>
            </label>
          );
        })}
      </div>

      {/* Selection counter and announce button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
            fontWeight: 'bold',
            color: selectedHostages.size === hostageCount ? roomColor : 'var(--text-secondary, #6b7280)',
          }}
        >
          선택: {selectedHostages.size} / {hostageCount}
        </div>
        <button
          onClick={handleAnnounceHostages}
          disabled={!canAnnounce}
          style={{
            flex: 1,
            minWidth: '150px',
            padding: 'clamp(0.75rem, 2.5vw, 1rem)',
            backgroundColor: canAnnounce ? roomColor : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
            fontWeight: 'bold',
            cursor: canAnnounce ? 'pointer' : 'not-allowed',
            opacity: canAnnounce ? 1 : 0.6,
          }}
        >
          📢 인질 발표
        </button>
      </div>
    </div>
  );
}
