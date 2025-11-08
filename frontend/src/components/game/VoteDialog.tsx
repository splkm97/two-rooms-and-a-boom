import { useEffect, useState, useMemo } from 'react';
import type { VoteSession, VoteChoice, VoteResultPayload } from '../../types/game.types';

interface VoteDialogProps {
  isOpen: boolean;
  voteSession: VoteSession | null;
  voteResult: VoteResultPayload | null;
  hasVoted: boolean;
  onVote: (vote: VoteChoice) => void;
}

/**
 * VoteDialog - Democratic voting UI for leader removal
 *
 * Shows:
 * - Vote session information (target leader, initiator)
 * - Countdown timer
 * - Vote progress
 * - YES/NO buttons
 * - Result display
 * - Auto-closes after result shown
 */
export function VoteDialog({
  isOpen,
  voteSession,
  voteResult,
  hasVoted,
  onVote,
}: VoteDialogProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    if (!voteSession || voteSession.status !== 'ACTIVE') {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(voteSession.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [voteSession]);

  // Show result and auto-close after 5 seconds
  useEffect(() => {
    if (voteResult) {
      setShowResult(true);
      // Auto-close is handled by parent component
    }
  }, [voteResult]);

  // Reset when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowResult(false);
    }
  }, [isOpen]);

  const progress = useMemo(() => {
    if (!voteSession) return 0;
    return (voteSession.votedCount / voteSession.totalVoters) * 100;
  }, [voteSession]);

  if (!isOpen || (!voteSession && !voteResult)) {
    return null;
  }

  // Cannot dismiss during active vote
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (showResult) {
      // Can close when showing result
      if (e.target === e.currentTarget) {
        // Handled by parent's auto-close
      }
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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vote-dialog-title"
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary, #ffffff)',
          borderRadius: '12px',
          padding: 'clamp(1.5rem, 4vw, 2rem)',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!showResult ? (
          /* Active vote */
          <>
            <h2
              id="vote-dialog-title"
              style={{
                margin: '0 0 1rem 0',
                fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
                color: 'var(--text-primary, #1f2937)',
                textAlign: 'center',
              }}
            >
              리더 교체 투표
            </h2>

            {voteSession && (
              <>
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
                      margin: '0 0 0.5rem 0',
                      fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
                      color: 'var(--text-primary, #1f2937)',
                      textAlign: 'center',
                    }}
                  >
                    <strong>{voteSession.targetLeaderName}</strong> 리더를 교체하시겠습니까?
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                      color: 'var(--text-secondary, #6b7280)',
                      textAlign: 'center',
                    }}
                  >
                    제안자: {voteSession.initiatorName}
                  </p>
                </div>

                {/* Timer and progress */}
                <div
                  style={{
                    marginBottom: '1.5rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                        color: timeRemaining < 10 ? '#ef4444' : 'var(--text-secondary, #6b7280)',
                        fontWeight: timeRemaining < 10 ? 'bold' : 'normal',
                      }}
                    >
                      ⏱️ {timeRemaining}초 남음
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                        color: 'var(--text-secondary, #6b7280)',
                      }}
                    >
                      👥 {voteSession.votedCount} / {voteSession.totalVoters} 투표
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '12px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '6px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Vote buttons or waiting message */}
                {!hasVoted ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <button
                      onClick={() => onVote('NO')}
                      style={{
                        flex: 1,
                        padding: 'clamp(0.75rem, 2.5vw, 1rem)',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        minHeight: '50px',
                      }}
                    >
                      ❌ 유지
                    </button>
                    <button
                      onClick={() => onVote('YES')}
                      style={{
                        flex: 1,
                        padding: 'clamp(0.75rem, 2.5vw, 1rem)',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        minHeight: '50px',
                      }}
                    >
                      ✅ 교체
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 'clamp(1rem, 3vw, 1.5rem)',
                      backgroundColor: '#dbeafe',
                      border: '2px solid #3b82f6',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      textAlign: 'center',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                        color: '#1e40af',
                        fontWeight: 600,
                      }}
                    >
                      ✓ 투표가 완료되었습니다
                    </p>
                    <p
                      style={{
                        margin: '0.5rem 0 0 0',
                        fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
                        color: '#1e40af',
                      }}
                    >
                      다른 플레이어의 투표를 기다리는 중...
                    </p>
                  </div>
                )}

                <p
                  style={{
                    margin: 0,
                    fontSize: 'clamp(0.75rem, 2vw, 0.8rem)',
                    color: 'var(--text-secondary, #6b7280)',
                    textAlign: 'center',
                  }}
                >
                  {hasVoted
                    ? '모든 플레이어가 투표하거나 시간이 종료되면 결과가 표시됩니다'
                    : '과반수 찬성 시 리더가 교체됩니다'}
                </p>
              </>
            )}
          </>
        ) : (
          /* Vote result */
          <>
            <h2
              style={{
                margin: '0 0 1.5rem 0',
                fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
                color: 'var(--text-primary, #1f2937)',
                textAlign: 'center',
              }}
            >
              투표 결과
            </h2>

            {voteResult && (
              <>
                <div
                  style={{
                    padding: 'clamp(1.5rem, 4vw, 2rem)',
                    backgroundColor:
                      voteResult.result === 'PASSED'
                        ? '#fee2e2'
                        : voteResult.result === 'FAILED'
                          ? '#dcfce7'
                          : '#fef3c7',
                    border: `3px solid ${
                      voteResult.result === 'PASSED'
                        ? '#ef4444'
                        : voteResult.result === 'FAILED'
                          ? '#10b981'
                          : '#f59e0b'
                    }`,
                    borderRadius: '12px',
                    marginBottom: '1.5rem',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                      fontWeight: 'bold',
                      marginBottom: '1rem',
                      color:
                        voteResult.result === 'PASSED'
                          ? '#991b1b'
                          : voteResult.result === 'FAILED'
                            ? '#065f46'
                            : '#92400e',
                    }}
                  >
                    {voteResult.result === 'PASSED'
                      ? '✅ 교체 찬성'
                      : voteResult.result === 'FAILED'
                        ? '❌ 교체 반대'
                        : '⏱️ 시간 초과'}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
                          fontWeight: 'bold',
                          color: '#ef4444',
                        }}
                      >
                        {voteResult.yesVotes}
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
                          color: 'var(--text-secondary, #6b7280)',
                        }}
                      >
                        찬성
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                        color: 'var(--text-secondary, #6b7280)',
                      }}
                    >
                      :
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
                          fontWeight: 'bold',
                          color: '#10b981',
                        }}
                      >
                        {voteResult.noVotes}
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
                          color: 'var(--text-secondary, #6b7280)',
                        }}
                      >
                        반대
                      </div>
                    </div>
                  </div>

                  {voteResult.result === 'PASSED' && voteResult.newLeaderName && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '8px',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
                          color: 'var(--text-primary, #1f2937)',
                          fontWeight: 600,
                        }}
                      >
                        👑 <strong>{voteResult.newLeaderName}</strong>님이 새로운 리더입니다
                      </p>
                    </div>
                  )}

                  {voteResult.result === 'FAILED' && voteSession && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '8px',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
                          color: 'var(--text-primary, #1f2937)',
                          fontWeight: 600,
                        }}
                      >
                        👑 <strong>{voteSession.targetLeaderName}</strong>님이 리더로 유지됩니다
                      </p>
                    </div>
                  )}
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
                    color: 'var(--text-secondary, #6b7280)',
                    textAlign: 'center',
                  }}
                >
                  이 창은 자동으로 닫힙니다...
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
