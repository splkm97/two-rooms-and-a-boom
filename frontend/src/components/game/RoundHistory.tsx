import { useState } from 'react';
import type { ExchangeRecord, LeadershipChangedPayload } from '../../types/game.types';

interface RoundHistoryEvent {
  type: 'exchange' | 'leadership_change';
  roundNumber: number;
  timestamp: string;
  data: ExchangeRecord | LeadershipChangedPayload;
}

interface RoundHistoryProps {
  events: RoundHistoryEvent[];
}

/**
 * RoundHistory - Timeline of round events
 *
 * Shows:
 * - Hostage exchanges per round
 * - Leadership changes (transfer, vote, disconnect)
 * - Timestamps
 * - Collapsible per round
 */
export function RoundHistory({ events }: RoundHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([1, 2, 3]));

  if (events.length === 0) {
    return null;
  }

  // Group events by round
  const eventsByRound = events.reduce(
    (acc, event) => {
      const round = event.roundNumber;
      if (!acc[round]) {
        acc[round] = [];
      }
      acc[round].push(event);
      return acc;
    },
    {} as Record<number, RoundHistoryEvent[]>
  );

  const rounds = Object.keys(eventsByRound)
    .map(Number)
    .sort((a, b) => b - a); // Most recent first

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(round)) {
        newSet.delete(round);
      } else {
        newSet.add(round);
      }
      return newSet;
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatLeadershipReason = (reason: string) => {
    switch (reason) {
      case 'VOLUNTARY_TRANSFER':
        return '자발적 이전';
      case 'DISCONNECTION':
        return '연결 끊김';
      case 'VOTE_REMOVAL':
        return '투표로 교체';
      default:
        return reason;
    }
  };

  return (
    <div
      style={{
        border: '2px solid var(--border-color, #e5e7eb)',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-card, #ffffff)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: 'clamp(0.75rem, 2vw, 1rem)',
          backgroundColor: 'var(--bg-secondary, #f3f4f6)',
          border: 'none',
          borderBottom: isExpanded ? '2px solid var(--border-color, #e5e7eb)' : 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              fontSize: 'clamp(1rem, 3vw, 1.1rem)',
              fontWeight: 'bold',
              color: 'var(--text-primary, #1f2937)',
            }}
          >
            📜 라운드 히스토리
          </span>
          <span
            style={{
              fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
              color: 'var(--text-secondary, #6b7280)',
              backgroundColor: 'var(--bg-primary, #ffffff)',
              padding: '0.25rem 0.5rem',
              borderRadius: '12px',
            }}
          >
            {events.length}개 이벤트
          </span>
        </div>
        <span
          style={{
            fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
            color: 'var(--text-secondary, #6b7280)',
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div
          style={{
            padding: 'clamp(1rem, 3vw, 1.5rem)',
            maxHeight: '500px',
            overflowY: 'auto',
          }}
        >
          {rounds.length === 0 ? (
            <p
              style={{
                textAlign: 'center',
                color: 'var(--text-secondary, #6b7280)',
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
              }}
            >
              아직 기록된 이벤트가 없습니다
            </p>
          ) : (
            rounds.map((round) => {
              const roundEvents = eventsByRound[round];
              const isRoundExpanded = expandedRounds.has(round);

              return (
                <div
                  key={round}
                  style={{
                    marginBottom: '1rem',
                    border: '1px solid var(--border-color, #e5e7eb)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Round header */}
                  <button
                    onClick={() => toggleRound(round)}
                    style={{
                      width: '100%',
                      padding: 'clamp(0.65rem, 2vw, 0.75rem) clamp(0.75rem, 2.5vw, 1rem)',
                      backgroundColor: '#f9fafb',
                      border: 'none',
                      borderBottom: isRoundExpanded
                        ? '1px solid var(--border-color, #e5e7eb)'
                        : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'clamp(0.95rem, 2.5vw, 1rem)',
                        fontWeight: 600,
                        color: 'var(--text-primary, #1f2937)',
                      }}
                    >
                      라운드 {round} ({roundEvents.length}개)
                    </span>
                    <span
                      style={{
                        fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                        color: 'var(--text-secondary, #6b7280)',
                        transition: 'transform 0.2s',
                        transform: isRoundExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▼
                    </span>
                  </button>

                  {/* Round events */}
                  {isRoundExpanded && (
                    <div
                      style={{
                        padding: 'clamp(0.75rem, 2.5vw, 1rem)',
                      }}
                    >
                      {roundEvents.map((event, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: 'clamp(0.65rem, 2vw, 0.75rem)',
                            backgroundColor: 'var(--bg-secondary, #f3f4f6)',
                            borderRadius: '6px',
                            marginBottom: idx < roundEvents.length - 1 ? '0.5rem' : 0,
                            borderLeft: `4px solid ${
                              event.type === 'exchange' ? '#3b82f6' : '#8b5cf6'
                            }`,
                          }}
                        >
                          {event.type === 'exchange' ? (
                            /* Exchange event */
                            <div>
                              <div
                                style={{
                                  fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
                                  color: 'var(--text-secondary, #6b7280)',
                                  marginBottom: '0.25rem',
                                }}
                              >
                                {formatTime(event.timestamp)}
                              </div>
                              <div
                                style={{
                                  fontSize: 'clamp(0.9rem, 2.5vw, 0.95rem)',
                                  color: 'var(--text-primary, #1f2937)',
                                }}
                              >
                                <strong>{(event.data as ExchangeRecord).playerName}</strong>{' '}
                                <span
                                  style={{
                                    color:
                                      (event.data as ExchangeRecord).fromRoom === 'RED_ROOM'
                                        ? '#dc2626'
                                        : '#2563eb',
                                  }}
                                >
                                  {(event.data as ExchangeRecord).fromRoom === 'RED_ROOM'
                                    ? '빨간 방'
                                    : '파란 방'}
                                </span>{' '}
                                →{' '}
                                <span
                                  style={{
                                    color:
                                      (event.data as ExchangeRecord).toRoom === 'RED_ROOM'
                                        ? '#dc2626'
                                        : '#2563eb',
                                  }}
                                >
                                  {(event.data as ExchangeRecord).toRoom === 'RED_ROOM'
                                    ? '빨간 방'
                                    : '파란 방'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* Leadership change event */
                            <div>
                              <div
                                style={{
                                  fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
                                  color: 'var(--text-secondary, #6b7280)',
                                  marginBottom: '0.25rem',
                                }}
                              >
                                {formatTime(event.timestamp)} · 👑 리더십 변경
                              </div>
                              <div
                                style={{
                                  fontSize: 'clamp(0.9rem, 2.5vw, 0.95rem)',
                                  color: 'var(--text-primary, #1f2937)',
                                }}
                              >
                                <span
                                  style={{
                                    color:
                                      (event.data as LeadershipChangedPayload).roomColor ===
                                      'RED_ROOM'
                                        ? '#dc2626'
                                        : '#2563eb',
                                  }}
                                >
                                  {(event.data as LeadershipChangedPayload).roomColor ===
                                  'RED_ROOM'
                                    ? '빨간 방'
                                    : '파란 방'}
                                </span>
                                :{' '}
                                {(event.data as LeadershipChangedPayload).oldLeader ? (
                                  <>
                                    <strong>
                                      {(event.data as LeadershipChangedPayload).oldLeader?.nickname}
                                    </strong>{' '}
                                    →{' '}
                                  </>
                                ) : null}
                                <strong>
                                  {(event.data as LeadershipChangedPayload).newLeader?.nickname || '알 수 없음'}
                                </strong>
                                <div
                                  style={{
                                    fontSize: 'clamp(0.75rem, 2vw, 0.8rem)',
                                    color: 'var(--text-secondary, #6b7280)',
                                    marginTop: '0.25rem',
                                  }}
                                >
                                  사유:{' '}
                                  {formatLeadershipReason(
                                    (event.data as LeadershipChangedPayload).reason
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
