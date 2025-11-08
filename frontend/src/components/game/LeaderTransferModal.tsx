import { useState, useEffect } from 'react';
import type { Player } from '../../types/game.types';

interface LeaderTransferModalProps {
  isOpen: boolean;
  currentLeader: Player;
  roomPlayers: Player[];
  onTransfer: (newLeaderId: string) => void;
  onCancel: () => void;
  canTransfer: boolean;
  blockReason?: string;
}

/**
 * LeaderTransferModal - Modal for voluntary leadership transfer
 *
 * Allows current leader to transfer leadership to another player in the same room.
 * Includes confirmation step and validation.
 */
export function LeaderTransferModal({
  isOpen,
  currentLeader,
  roomPlayers,
  onTransfer,
  onCancel,
  canTransfer,
  blockReason,
}: LeaderTransferModalProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlayerId('');
      setShowConfirm(false);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  // Filter out current leader and get eligible players
  const eligiblePlayers = roomPlayers.filter((p) => p.id !== currentLeader.id);

  const selectedPlayer = eligiblePlayers.find((p) => p.id === selectedPlayerId);

  const handleNext = () => {
    if (!selectedPlayerId) {
      alert('새로운 리더를 선택해주세요');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (selectedPlayerId) {
      onTransfer(selectedPlayerId);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close on backdrop click, not modal content click
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary, #ffffff)',
          borderRadius: '12px',
          padding: 'clamp(1.5rem, 4vw, 2rem)',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!showConfirm ? (
          /* Selection step */
          <>
            <h2
              id="transfer-modal-title"
              style={{
                margin: '0 0 1rem 0',
                fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
                color: 'var(--text-primary, #1f2937)',
              }}
            >
              리더십 이전
            </h2>

            {!canTransfer && blockReason && (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee2e2',
                  border: '2px solid #ef4444',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
                    color: '#991b1b',
                    fontWeight: 600,
                  }}
                >
                  ⚠️ {blockReason}
                </p>
              </div>
            )}

            <p
              style={{
                margin: '0 0 1.5rem 0',
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                color: 'var(--text-secondary, #6b7280)',
                lineHeight: 1.6,
              }}
            >
              같은 방에 있는 플레이어 중 새로운 리더를 선택하세요:
            </p>

            {/* Player selection */}
            <div
              style={{
                marginBottom: '1.5rem',
                border: '1px solid var(--border-color, #e5e7eb)',
                borderRadius: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {eligiblePlayers.length === 0 ? (
                <div
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-secondary, #6b7280)',
                  }}
                >
                  <p>방에 다른 플레이어가 없습니다</p>
                </div>
              ) : (
                eligiblePlayers.map((player) => (
                  <label
                    key={player.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 'clamp(0.75rem, 2vw, 1rem)',
                      borderBottom: '1px solid var(--border-color, #e5e7eb)',
                      backgroundColor: selectedPlayerId === player.id ? '#eff6ff' : 'transparent',
                      cursor: 'pointer',
                      minHeight: '44px', // Touch-friendly
                    }}
                  >
                    <input
                      type="radio"
                      name="newLeader"
                      value={player.id}
                      checked={selectedPlayerId === player.id}
                      onChange={() => setSelectedPlayerId(player.id)}
                      style={{
                        width: 'clamp(18px, 4vw, 20px)',
                        height: 'clamp(18px, 4vw, 20px)',
                        marginRight: 'clamp(0.5rem, 2vw, 0.75rem)',
                        cursor: 'pointer',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 'clamp(0.95rem, 2.5vw, 1rem)',
                          fontWeight: selectedPlayerId === player.id ? 600 : 400,
                          color: 'var(--text-primary, #1f2937)',
                        }}
                      >
                        {player.nickname}
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(0.75rem, 2vw, 0.8rem)',
                          color: 'var(--text-secondary, #6b7280)',
                          marginTop: '0.25rem',
                        }}
                      >
                        {player.isOwner ? '방장' : '플레이어'}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Warning */}
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '6px',
                marginBottom: '1.5rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
                  color: '#92400e',
                }}
              >
                ⚠️ 이 작업은 되돌릴 수 없습니다
              </p>
            </div>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={onCancel}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  padding: 'clamp(0.65rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.25rem)',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleNext}
                disabled={!selectedPlayerId || !canTransfer}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  padding: 'clamp(0.65rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.25rem)',
                  backgroundColor: selectedPlayerId && canTransfer ? '#2563eb' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  fontWeight: 'bold',
                  cursor: selectedPlayerId && canTransfer ? 'pointer' : 'not-allowed',
                  opacity: selectedPlayerId && canTransfer ? 1 : 0.6,
                }}
              >
                다음
              </button>
            </div>
          </>
        ) : (
          /* Confirmation step */
          <>
            <h2
              style={{
                margin: '0 0 1rem 0',
                fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
                color: 'var(--text-primary, #1f2937)',
              }}
            >
              리더십 이전 확인
            </h2>

            <div
              style={{
                padding: 'clamp(1rem, 3vw, 1.5rem)',
                backgroundColor: 'var(--bg-secondary, #f3f4f6)',
                borderRadius: '8px',
                marginBottom: '1.5rem',
              }}
            >
              <p
                style={{
                  margin: '0 0 1rem 0',
                  fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
                  color: 'var(--text-primary, #1f2937)',
                  textAlign: 'center',
                }}
              >
                <strong>{selectedPlayer?.nickname}</strong>님에게 리더십을 이전하시겠습니까?
              </p>
              <div
                style={{
                  fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
                  color: 'var(--text-secondary, #6b7280)',
                  textAlign: 'center',
                }}
              >
                <div>현재 리더: {currentLeader.nickname}</div>
                <div style={{ margin: '0.5rem 0', fontSize: '1.5rem' }}>↓</div>
                <div>새 리더: {selectedPlayer?.nickname}</div>
              </div>
            </div>

            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#fee2e2',
                border: '2px solid #ef4444',
                borderRadius: '6px',
                marginBottom: '1.5rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
                  color: '#991b1b',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                ⚠️ 이 작업은 되돌릴 수 없습니다
              </p>
            </div>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  padding: 'clamp(0.65rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.25rem)',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                뒤로
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  padding: 'clamp(0.65rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.25rem)',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                확인
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
