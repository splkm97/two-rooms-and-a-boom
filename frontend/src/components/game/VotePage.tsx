import { useEffect, useState } from 'react';
import type {
  VoteSession,
  VoteResultPayload,
  VoteChoice,
  Player,
} from '../../types/game.types';

interface VotePageProps {
  voteSession: VoteSession;
  voteResult: VoteResultPayload | null;
  hasVoted: boolean;
  players: Player[];
  currentPlayer: Player;
  onVote: (vote: VoteChoice | string) => Promise<void>;
  onClose: () => void;
}

/**
 * VotePage - Full-screen voting interface
 *
 * Displays either:
 * - REMOVAL vote: YES/NO to remove current leader
 * - ELECTION vote: Select new leader from candidates
 */
export function VotePage({
  voteSession,
  voteResult,
  hasVoted,
  players,
  currentPlayer,
  onVote,
  onClose,
}: VotePageProps) {
  const [timeRemaining, setTimeRemaining] = useState(voteSession.timeoutSeconds);
  const [isVoting, setIsVoting] = useState(false);

  // Determine vote type
  const isElection = voteSession.candidates && voteSession.candidates.length > 0;
  const isRemoval = !isElection;

  // Get room color for styling
  const isRedRoom = voteSession.roomColor === 'RED_ROOM';
  const roomColorName = isRedRoom ? '빨간 방' : '파란 방';
  const roomColor = isRedRoom ? '#dc2626' : '#2563eb';

  // Countdown timer
  useEffect(() => {
    if (voteResult || hasVoted) return; // Stop countdown if vote completed or already voted

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [voteResult, hasVoted]);

  // Handle vote submission
  const handleVoteClick = async (vote: VoteChoice | string) => {
    setIsVoting(true);
    try {
      await onVote(vote);
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  };

  // Get candidate players for election
  const candidatePlayers = isElection
    ? players.filter((p) => voteSession.candidates?.includes(p.id))
    : [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-primary, #ffffff)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'clamp(1rem, 3vw, 1.5rem)',
          backgroundColor: 'var(--bg-secondary, #f3f4f6)',
          borderBottom: '2px solid var(--border-color, #e5e7eb)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-color, #e5e7eb)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
            color: 'var(--text-primary, #1f2937)',
          }}
        >
          ← 뒤로
        </button>
        <h1
          style={{
            fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
            fontWeight: 'bold',
            color: 'var(--text-primary, #1f2937)',
            margin: 0,
          }}
        >
          {isRemoval ? '🗳️ 리더 교체 투표' : '👑 새 리더 선출'}
        </h1>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: 'clamp(1.5rem, 4vw, 2rem)',
          maxWidth: '600px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Vote Question */}
        <div
          style={{
            marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
            padding: 'clamp(1.25rem, 3vw, 1.5rem)',
            backgroundColor: 'var(--bg-card, #ffffff)',
            border: `3px solid ${roomColor}`,
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          {isRemoval ? (
            <>
              <div
                style={{
                  fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
                  fontWeight: 600,
                  color: 'var(--text-primary, #1f2937)',
                  marginBottom: '0.5rem',
                }}
              >
                {voteSession.targetLeaderName} 리더를 교체하시겠습니까?
              </div>
              <div
                style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  color: roomColor,
                  fontWeight: 600,
                }}
              >
                {roomColorName}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
                  fontWeight: 600,
                  color: 'var(--text-primary, #1f2937)',
                  marginBottom: '0.5rem',
                }}
              >
                새로운 {roomColorName} 리더를 선출하세요
              </div>
              <div
                style={{
                  fontSize: 'clamp(0.85rem, 2vw, 0.9rem)',
                  color: 'var(--text-secondary, #6b7280)',
                }}
              >
                이전 리더: {voteSession.targetLeaderName}
              </div>
            </>
          )}
        </div>

        {/* Vote Info */}
        <div
          style={{
            marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-secondary, #f3f4f6)',
              borderRadius: '8px',
            }}
          >
            <span style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
              투표 시작자:
            </span>
            <span
              style={{
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                fontWeight: 600,
                color: 'var(--text-primary, #1f2937)',
              }}
            >
              {voteSession.initiatorName}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              backgroundColor: timeRemaining <= 10 ? '#fef3c7' : 'var(--bg-secondary, #f3f4f6)',
              borderRadius: '8px',
            }}
          >
            <span style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
              ⏱️ 남은 시간:
            </span>
            <span
              style={{
                fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
                fontWeight: 'bold',
                color: timeRemaining <= 10 ? '#d97706' : 'var(--text-primary, #1f2937)',
              }}
            >
              {timeRemaining}초
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-secondary, #f3f4f6)',
              borderRadius: '8px',
            }}
          >
            <span style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
              📊 투표 현황:
            </span>
            <span
              style={{
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                fontWeight: 600,
                color: 'var(--text-primary, #1f2937)',
              }}
            >
              {voteSession.votedCount} / {voteSession.totalVoters} 명
            </span>
          </div>
        </div>

        {/* Vote Result Display */}
        {voteResult && (
          <div
            style={{
              marginBottom: 'clamp(1.5rem, 4vw, 2rem)',
              padding: 'clamp(1.25rem, 3vw, 1.5rem)',
              backgroundColor:
                voteResult.result === 'PASSED'
                  ? '#dcfce7'
                  : voteResult.result === 'FAILED'
                  ? '#fee2e2'
                  : '#fef3c7',
              border: `2px solid ${
                voteResult.result === 'PASSED'
                  ? '#16a34a'
                  : voteResult.result === 'FAILED'
                  ? '#dc2626'
                  : '#d97706'
              }`,
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(1.25rem, 3.5vw, 1.5rem)',
                fontWeight: 'bold',
                color:
                  voteResult.result === 'PASSED'
                    ? '#16a34a'
                    : voteResult.result === 'FAILED'
                    ? '#dc2626'
                    : '#d97706',
                marginBottom: '0.5rem',
              }}
            >
              {voteResult.result === 'PASSED'
                ? '✅ 투표 통과'
                : voteResult.result === 'FAILED'
                ? '❌ 투표 부결'
                : '⏱️ 시간 초과'}
            </div>
            {isRemoval && (
              <div
                style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  color: 'var(--text-secondary, #6b7280)',
                }}
              >
                찬성: {voteResult.yesVotes} / 반대: {voteResult.noVotes}
              </div>
            )}
            {voteResult.newLeaderName && (
              <div
                style={{
                  fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
                  fontWeight: 600,
                  color: 'var(--text-primary, #1f2937)',
                  marginTop: '0.5rem',
                }}
              >
                새 리더: {voteResult.newLeaderName}
              </div>
            )}
          </div>
        )}

        {/* Voting Buttons - Removal Vote */}
        {!voteResult && !hasVoted && isRemoval && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'clamp(1rem, 3vw, 1.5rem)',
            }}
          >
            <button
              onClick={() => handleVoteClick('YES')}
              disabled={isVoting || timeRemaining === 0}
              style={{
                padding: 'clamp(1.5rem, 4vw, 2rem)',
                backgroundColor: isVoting || timeRemaining === 0 ? '#d1d5db' : '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
                fontWeight: 'bold',
                cursor: isVoting || timeRemaining === 0 ? 'not-allowed' : 'pointer',
                opacity: isVoting || timeRemaining === 0 ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >
              ✓ 찬성
            </button>
            <button
              onClick={() => handleVoteClick('NO')}
              disabled={isVoting || timeRemaining === 0}
              style={{
                padding: 'clamp(1.5rem, 4vw, 2rem)',
                backgroundColor: isVoting || timeRemaining === 0 ? '#d1d5db' : '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
                fontWeight: 'bold',
                cursor: isVoting || timeRemaining === 0 ? 'not-allowed' : 'pointer',
                opacity: isVoting || timeRemaining === 0 ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >
              ✗ 반대
            </button>
          </div>
        )}

        {/* Voting Buttons - Election Vote */}
        {!voteResult && !hasVoted && isElection && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(0.75rem, 2vw, 1rem)',
            }}
          >
            {candidatePlayers.map((candidate) => (
              <button
                key={candidate.id}
                onClick={() => handleVoteClick(candidate.id)}
                disabled={isVoting || timeRemaining === 0}
                style={{
                  padding: 'clamp(1.25rem, 3vw, 1.5rem)',
                  backgroundColor:
                    isVoting || timeRemaining === 0 ? '#f3f4f6' : 'var(--bg-card, #ffffff)',
                  border: `2px solid ${
                    isVoting || timeRemaining === 0 ? '#d1d5db' : roomColor
                  }`,
                  borderRadius: '12px',
                  fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
                  fontWeight: 600,
                  color: 'var(--text-primary, #1f2937)',
                  cursor: isVoting || timeRemaining === 0 ? 'not-allowed' : 'pointer',
                  opacity: isVoting || timeRemaining === 0 ? 0.5 : 1,
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <span style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>👤</span>
                <span>{candidate.nickname}</span>
                {candidate.id === currentPlayer.id && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
                      color: 'var(--text-secondary, #6b7280)',
                    }}
                  >
                    (나)
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* After Vote Message */}
        {hasVoted && !voteResult && (
          <div
            style={{
              padding: 'clamp(1.5rem, 4vw, 2rem)',
              backgroundColor: '#e0e7ff',
              border: '2px solid #6366f1',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
                fontWeight: 600,
                color: '#4f46e5',
                marginBottom: '0.5rem',
              }}
            >
              ✓ 투표 완료
            </div>
            <div
              style={{
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                color: 'var(--text-secondary, #6b7280)',
              }}
            >
              다른 플레이어들의 투표를 기다리는 중...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
