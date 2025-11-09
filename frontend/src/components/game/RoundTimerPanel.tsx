import { useState } from 'react';
import type { Player, RoomColor, RoundState } from '../../types/game.types';

interface RoundTimerPanelProps {
  isLeader: boolean;
  roundState: RoundState | null;
  players: Player[];
  currentPlayerId: string;
  currentRoom: RoomColor;
  onSelectHostages: (hostageIds: string[]) => void;
  onLeaderReady: () => void;
  onTransferLeadership: (newLeaderId: string) => void;
}

/**
 * RoundTimerPanel - Comprehensive round management UI for leaders
 *
 * Features:
 * - Round timer display with countdown
 * - Hostage selection during SELECTING phase
 * - Ready confirmation after exchange
 * - Visual feedback for different round states
 */
export function RoundTimerPanel({
  isLeader,
  roundState,
  players,
  currentPlayerId,
  currentRoom,
  onSelectHostages,
  onLeaderReady,
  onTransferLeadership,
}: RoundTimerPanelProps) {
  const [selectedHostages, setSelectedHostages] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [selectedNewLeader, setSelectedNewLeader] = useState<string>('');

  if (!isLeader || !roundState) {
    return null;
  }

  const roomName = currentRoom === 'RED_ROOM' ? '빨간 방' : '파란 방';
  const otherRoomName = currentRoom === 'RED_ROOM' ? '파란 방' : '빨간 방';
  const roomColor = currentRoom === 'RED_ROOM' ? '#dc2626' : '#2563eb';

  const isRedLeader = currentRoom === 'RED_ROOM';
  const isMyTurnReady = isRedLeader ? !roundState.redLeaderReady : !roundState.blueLeaderReady;
  const otherLeaderReady = isRedLeader ? roundState.blueLeaderReady : roundState.redLeaderReady;

  // Filter players by current room for selection UI
  const playersInMyRoom = players.filter((p) => p.currentRoom === currentRoom);

  const isSelecting = roundState.status === 'SELECTING';
  const isExchanging = roundState.status === 'EXCHANGING';
  const isComplete = roundState.status === 'COMPLETE';

  // Check if hostages are already selected
  const hostagesSelected = isRedLeader
    ? roundState.redHostages && roundState.redHostages.length > 0
    : roundState.blueHostages && roundState.blueHostages.length > 0;

  const handleToggleHostage = (playerId: string) => {
    if (hostagesSelected) {
      return;
    }

    setError('');

    // Cannot select self
    if (playerId === currentPlayerId) {
      setError('리더는 자기 자신을 인질로 선택할 수 없습니다');
      return;
    }

    // Cannot select any leader (Red or Blue)
    if (playerId === roundState.redLeaderId || playerId === roundState.blueLeaderId) {
      setError('리더는 인질로 선택할 수 없습니다. 리더십을 먼저 양도해야 합니다.');
      return;
    }

    setSelectedHostages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        // Check if we've reached the limit
        if (newSet.size >= roundState.hostageCount) {
          setError(`최대 ${roundState.hostageCount}명까지만 선택할 수 있습니다`);
          return prev;
        }
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const handleAnnounceHostages = () => {
    if (selectedHostages.size !== roundState.hostageCount) {
      setError(`정확히 ${roundState.hostageCount}명을 선택해야 합니다`);
      return;
    }

    if (
      confirm(
        `선택한 ${selectedHostages.size}명을 ${otherRoomName}으로 보내시겠습니까?\n\n이 결정은 취소할 수 없습니다.`
      )
    ) {
      onSelectHostages(Array.from(selectedHostages));
    }
  };

  const handleReady = () => {
    if (confirm('다음 라운드를 시작할 준비가 되셨습니까?')) {
      setIsReady(true);
      onLeaderReady();
    }
  };

  const handleTransferLeadership = () => {
    if (!selectedNewLeader) {
      alert('새 리더를 선택해주세요');
      return;
    }

    if (
      confirm(
        `리더십을 ${players.find((p) => p.id === selectedNewLeader)?.nickname}에게 양도하시겠습니까?\n\n이 결정은 취소할 수 없습니다.`
      )
    ) {
      onTransferLeadership(selectedNewLeader);
      setShowTransferModal(false);
      setSelectedNewLeader('');
    }
  };

  const canAnnounce = selectedHostages.size === roundState.hostageCount && !hostagesSelected;

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render hostage list
  const renderHostageList = () => {
    const myHostages = isRedLeader ? roundState.redHostages : roundState.blueHostages;
    if (!myHostages || myHostages.length === 0) return null;

    return (
      <div
        style={{
          marginTop: '0.75rem',
          padding: 'clamp(0.5rem, 2vw, 0.75rem)',
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          border: '1px solid #10b981',
        }}
      >
        <p
          style={{
            margin: '0 0 0.5rem 0',
            fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
            color: '#065f46',
            fontWeight: 600,
          }}
        >
          📋 선택된 인질:
        </p>
        <ul
          style={{
            margin: 0,
            padding: '0 0 0 1.5rem',
            listStyle: 'disc',
          }}
        >
          {myHostages.map((hostageId) => {
            const hostage = players.find((p) => p.id === hostageId);
            return (
              <li
                key={hostageId}
                style={{
                  fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
                  color: '#047857',
                  marginBottom: '0.25rem',
                }}
              >
                {hostage?.nickname || '알 수 없는 플레이어'}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

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
      {/* Header with Round Info */}
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
            👑 {roomName} 리더
          </h3>
          <p
            style={{
              margin: '0.25rem 0 0 0',
              fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
              color: 'var(--text-secondary, #6b7280)',
            }}
          >
            라운드 {roundState.roundNumber}
          </p>
        </div>
      </div>

      {/* Active Phase - Leadership Transfer */}
      {roundState.status === 'ACTIVE' && (
        <>
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
              ⏰ 타이머가 종료되면 <strong>{roundState.hostageCount}명</strong>의 인질을 선택해야 합니다.
              <br />
              남은 시간 동안 팀원들과 전략을 논의하세요!
            </p>
          </div>

          <button
            onClick={() => setShowTransferModal(!showTransferModal)}
            style={{
              width: '100%',
              padding: 'clamp(0.75rem, 2.5vw, 1rem)',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: 'clamp(0.95rem, 2.5vw, 1rem)',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '1rem',
            }}
          >
            🔄 리더십 양도
          </button>

          {/* Transfer Modal */}
          {showTransferModal && (
            <div
              style={{
                padding: 'clamp(1rem, 3vw, 1.5rem)',
                backgroundColor: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '6px',
                marginBottom: '1rem',
              }}
            >
              <h4
                style={{
                  margin: '0 0 1rem 0',
                  fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
                  color: '#92400e',
                  fontWeight: 'bold',
                }}
              >
                새 리더 선택
              </h4>

              <div
                style={{
                  marginBottom: '1rem',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                }}
              >
                {playersInMyRoom
                  .filter((p) => p.id !== currentPlayerId)
                  .map((player) => (
                    <label
                      key={player.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 'clamp(0.75rem, 2vw, 1rem)',
                        borderBottom: '1px solid #fde68a',
                        backgroundColor: selectedNewLeader === player.id ? '#fde68a' : 'transparent',
                        cursor: 'pointer',
                        minHeight: '44px',
                      }}
                    >
                      <input
                        type="radio"
                        name="newLeader"
                        value={player.id}
                        checked={selectedNewLeader === player.id}
                        onChange={() => setSelectedNewLeader(player.id)}
                        style={{
                          width: 'clamp(18px, 4vw, 20px)',
                          height: 'clamp(18px, 4vw, 20px)',
                          marginRight: 'clamp(0.5rem, 2vw, 0.75rem)',
                          cursor: 'pointer',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                          color: '#92400e',
                          fontWeight: selectedNewLeader === player.id ? 600 : 400,
                        }}
                      >
                        {player.nickname}
                      </span>
                    </label>
                  ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleTransferLeadership}
                  disabled={!selectedNewLeader}
                  style={{
                    flex: 1,
                    padding: 'clamp(0.75rem, 2.5vw, 1rem)',
                    backgroundColor: selectedNewLeader ? '#8b5cf6' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: 'clamp(0.95rem, 2.5vw, 1rem)',
                    fontWeight: 'bold',
                    cursor: selectedNewLeader ? 'pointer' : 'not-allowed',
                    opacity: selectedNewLeader ? 1 : 0.6,
                  }}
                >
                  ✅ 양도
                </button>
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedNewLeader('');
                  }}
                  style={{
                    flex: 1,
                    padding: 'clamp(0.75rem, 2.5vw, 1rem)',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: 'clamp(0.95rem, 2.5vw, 1rem)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ❌ 취소
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Selecting Phase - Choose Hostages */}
      {isSelecting && !hostagesSelected && (
        <>
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
              ⏰ 시간 종료! <strong>{roundState.hostageCount}명</strong>을 선택하여 <strong>{otherRoomName}</strong>으로 보내세요
            </p>
          </div>

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
            {playersInMyRoom.map((player) => {
              const isSelected = selectedHostages.has(player.id);
              const isSelf = player.id === currentPlayerId;
              const isLeader =
                player.id === roundState.redLeaderId || player.id === roundState.blueLeaderId;
              const isDisabled = isSelf || isLeader;

              return (
                <label
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 'clamp(0.75rem, 2vw, 1rem)',
                    borderBottom: '1px solid var(--border-color, #e5e7eb)',
                    backgroundColor: isSelected ? `${roomColor}15` : 'transparent',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                    minHeight: '44px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleHostage(player.id)}
                    disabled={isDisabled}
                    style={{
                      width: 'clamp(18px, 4vw, 20px)',
                      height: 'clamp(18px, 4vw, 20px)',
                      marginRight: 'clamp(0.5rem, 2vw, 0.75rem)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
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
                    {isLeader && !isSelf && ' 👑'}
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
                color: selectedHostages.size === roundState.hostageCount ? roomColor : 'var(--text-secondary, #6b7280)',
              }}
            >
              선택: {selectedHostages.size} / {roundState.hostageCount}
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
        </>
      )}

      {/* Hostages Selected - Waiting for Other Leader */}
      {isSelecting && hostagesSelected && (
        <div
          style={{
            padding: 'clamp(0.75rem, 2vw, 1rem)',
            backgroundColor: '#d1fae5',
            border: '2px solid #10b981',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
              color: '#065f46',
              fontWeight: 600,
            }}
          >
            ✓ 인질 선택이 완료되었습니다. 상대 리더의 선택을 기다리는 중...
          </p>

          {renderHostageList()}
        </div>
      )}

      {/* Exchanging Phase */}
      {isExchanging && (
        <div
          style={{
            padding: 'clamp(0.75rem, 2vw, 1rem)',
            backgroundColor: '#dbeafe',
            border: '2px solid #3b82f6',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
              color: '#1e40af',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            🔄 인질 교환 진행 중...
          </p>

          {renderHostageList()}
        </div>
      )}

      {/* Complete Phase - Ready for Next Round */}
      {isComplete && (
        <>
          <div
            style={{
              padding: 'clamp(0.75rem, 2vw, 1rem)',
              backgroundColor: '#d1fae5',
              border: '2px solid #10b981',
              borderRadius: '6px',
              marginBottom: '1rem',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
                color: '#065f46',
                fontWeight: 600,
              }}
            >
              ✓ 라운드 {roundState.roundNumber} 완료!
              {roundState.roundNumber < 3 && ' 플레이어들이 물리적으로 방을 이동한 후 다음 라운드를 시작하세요.'}
              {roundState.roundNumber === 3 && ' 역할 공개 단계로 이동합니다.'}
            </p>

            {renderHostageList()}
          </div>

          {/* Ready Status */}
          {isMyTurnReady && !isReady && (
            <button
              onClick={handleReady}
              style={{
                width: '100%',
                padding: 'clamp(1rem, 2.5vw, 1.25rem)',
                backgroundColor: roomColor,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✅ 준비 완료
            </button>
          )}

          {isReady && (
            <div
              style={{
                padding: 'clamp(0.75rem, 2vw, 1rem)',
                backgroundColor: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '6px',
                textAlign: 'center',
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
                ⏳ 상대 리더의 준비를 기다리는 중...
                {otherLeaderReady && ' 곧 다음 라운드가 시작됩니다!'}
              </p>
            </div>
          )}

          {!isMyTurnReady && (
            <div
              style={{
                padding: 'clamp(0.75rem, 2vw, 1rem)',
                backgroundColor: '#d1fae5',
                border: '2px solid #10b981',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
                  color: '#065f46',
                  fontWeight: 600,
                }}
              >
                ✓ 준비 완료! {!otherLeaderReady && '상대 리더의 준비를 기다리는 중...'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
