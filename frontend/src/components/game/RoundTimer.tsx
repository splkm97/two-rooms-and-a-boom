import { useMemo } from 'react';

interface RoundTimerProps {
  round: number;
  timeRemaining: number;
  totalTime: number;
}

/**
 * RoundTimer - Circular countdown timer component
 *
 * Displays current round and time remaining with a circular progress bar.
 * Color changes based on time remaining (green → yellow → red).
 * Pulse animation when less than 30 seconds remain.
 */
export function RoundTimer({ round, timeRemaining, totalTime }: RoundTimerProps) {
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage (0-100)
  const progress = useMemo(() => {
    return (timeRemaining / totalTime) * 100;
  }, [timeRemaining, totalTime]);

  // Determine color based on time remaining
  const color = useMemo(() => {
    if (timeRemaining > 60) return '#10b981'; // Green
    if (timeRemaining > 30) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  }, [timeRemaining]);

  // Apply pulse animation when critical (<30s)
  const shouldPulse = timeRemaining < 30;

  // SVG circle properties
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--bg-primary, #ffffff)',
        borderBottom: '2px solid var(--border-color, #e5e7eb)',
        padding: 'clamp(0.75rem, 2vw, 1rem)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 'clamp(0.75rem, 2vw, 1.5rem)',
        }}
      >
        {/* Round indicator */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
              color: 'var(--text-secondary, #6b7280)',
              fontWeight: 500,
              marginBottom: '0.25rem',
            }}
          >
            라운드
          </div>
          <div
            style={{
              fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
              fontWeight: 'bold',
              color: 'var(--text-primary, #1f2937)',
            }}
          >
            {round} / 3
          </div>
        </div>

        {/* Circular timer */}
        <div
          style={{
            position: 'relative',
            width: `clamp(80px, 15vw, ${size}px)`,
            height: `clamp(80px, 15vw, ${size}px)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${size} ${size}`}
            style={{
              transform: 'rotate(-90deg)',
              animation: shouldPulse ? 'pulse 1s ease-in-out infinite' : 'none',
            }}
          >
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
              }}
            />
          </svg>
          {/* Time display */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                fontWeight: 'bold',
                color: color,
                fontVariantNumeric: 'tabular-nums',
              }}
              role="timer"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        {/* Status text */}
        <div style={{ textAlign: 'center', minWidth: '100px' }}>
          <div
            style={{
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
              color: 'var(--text-secondary, #6b7280)',
              marginBottom: '0.25rem',
            }}
          >
            {timeRemaining > 0 ? '남은 시간' : '라운드 종료'}
          </div>
          <div
            style={{
              fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
              fontWeight: 600,
              color: shouldPulse ? color : 'var(--text-primary, #1f2937)',
            }}
          >
            {timeRemaining > 60
              ? '전략 수립'
              : timeRemaining > 30
                ? '인질 선택 준비'
                : timeRemaining > 0
                  ? '⚠️ 시간 임박'
                  : '인질 선택'}
          </div>
        </div>
      </div>

      {/* CSS keyframes for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: rotate(-90deg) scale(1);
            }
            50% {
              opacity: 0.8;
              transform: rotate(-90deg) scale(1.05);
            }
          }
        `}
      </style>
    </div>
  );
}
