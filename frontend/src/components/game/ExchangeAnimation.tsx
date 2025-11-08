import { useEffect, useState } from 'react';
import type { ExchangeRecord } from '../../types/game.types';

interface ExchangeAnimationProps {
  isActive: boolean;
  exchanges: ExchangeRecord[];
  onComplete: () => void;
}

/**
 * ExchangeAnimation - Animated player movement between rooms
 *
 * Shows a fullscreen overlay with:
 * - Exchange in progress message
 * - List of players being exchanged
 * - Directional arrows showing movement
 * - Auto-closes after animation completes
 */
export function ExchangeAnimation({
  isActive,
  exchanges,
  onComplete,
}: ExchangeAnimationProps) {
  const [phase, setPhase] = useState<'entering' | 'showing' | 'exiting'>('entering');

  useEffect(() => {
    if (!isActive) {
      return;
    }

    // Animation sequence:
    // 1. Fade in (0.5s)
    // 2. Show exchanges (2.5s)
    // 3. Fade out (0.5s)
    setPhase('entering');

    const showTimer = setTimeout(() => {
      setPhase('showing');
    }, 500);

    const exitTimer = setTimeout(() => {
      setPhase('exiting');
    }, 3000);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, onComplete]);

  if (!isActive) {
    return null;
  }

  const opacity = phase === 'entering' ? 0 : phase === 'exiting' ? 0 : 1;

  // Group exchanges by direction
  const redToBlue = exchanges.filter((e) => e.fromRoom === 'RED_ROOM');
  const blueToRed = exchanges.filter((e) => e.fromRoom === 'BLUE_ROOM');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 'clamp(1rem, 3vw, 2rem)',
        opacity: opacity,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Title */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 'clamp(2rem, 5vw, 3rem)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(1.75rem, 6vw, 3rem)',
            fontWeight: 'bold',
            color: '#ffffff',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
          }}
        >
          ↔️ 인질 교환 진행 중
        </h1>
        <p
          style={{
            margin: '1rem 0 0 0',
            fontSize: 'clamp(1rem, 3vw, 1.5rem)',
            color: '#ffffff',
            opacity: 0.9,
          }}
        >
          플레이어들이 방 사이를 이동하고 있습니다...
        </p>
      </div>

      {/* Exchange display */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'clamp(1.5rem, 4vw, 2rem)',
          maxWidth: '900px',
          width: '100%',
        }}
      >
        {/* Red to Blue */}
        {redToBlue.length > 0 && (
          <div
            style={{
              padding: 'clamp(1.5rem, 4vw, 2rem)',
              backgroundColor: 'rgba(220, 38, 38, 0.2)',
              border: '3px solid #dc2626',
              borderRadius: '12px',
              animation: 'slideRight 2s ease-in-out',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
                  fontWeight: 'bold',
                  color: '#dc2626',
                  marginBottom: '0.5rem',
                }}
              >
                빨간 방 → 파란 방
              </div>
              <div
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3rem)',
                  color: '#ffffff',
                }}
              >
                →
              </div>
            </div>
            <div>
              {redToBlue.map((exchange) => (
                <div
                  key={exchange.playerId}
                  style={{
                    padding: 'clamp(0.65rem, 2vw, 0.75rem)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                    textAlign: 'center',
                    color: '#ffffff',
                    fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
                    fontWeight: 600,
                  }}
                >
                  {exchange.playerName}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blue to Red */}
        {blueToRed.length > 0 && (
          <div
            style={{
              padding: 'clamp(1.5rem, 4vw, 2rem)',
              backgroundColor: 'rgba(37, 99, 235, 0.2)',
              border: '3px solid #2563eb',
              borderRadius: '12px',
              animation: 'slideLeft 2s ease-in-out',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
                  fontWeight: 'bold',
                  color: '#2563eb',
                  marginBottom: '0.5rem',
                }}
              >
                파란 방 → 빨간 방
              </div>
              <div
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3rem)',
                  color: '#ffffff',
                }}
              >
                ←
              </div>
            </div>
            <div>
              {blueToRed.map((exchange) => (
                <div
                  key={exchange.playerId}
                  style={{
                    padding: 'clamp(0.65rem, 2vw, 0.75rem)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                    textAlign: 'center',
                    color: '#ffffff',
                    fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
                    fontWeight: 600,
                  }}
                >
                  {exchange.playerName}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>
        {`
          @keyframes slideRight {
            0% {
              transform: translateX(-50px);
              opacity: 0;
            }
            50% {
              transform: translateX(0);
              opacity: 1;
            }
            100% {
              transform: translateX(50px);
              opacity: 0.5;
            }
          }

          @keyframes slideLeft {
            0% {
              transform: translateX(50px);
              opacity: 0;
            }
            50% {
              transform: translateX(0);
              opacity: 1;
            }
            100% {
              transform: translateX(-50px);
              opacity: 0.5;
            }
          }
        `}
      </style>
    </div>
  );
}
