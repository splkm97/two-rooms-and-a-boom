import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomListItem } from './RoomListItem';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { listRooms, APIError } from '../../services/api';
import type { RoomListItem as RoomListItemType } from '../../types/game.types';

interface RoomListProps {
  status?: 'WAITING' | 'IN_PROGRESS';
  autoRefresh?: boolean;
  refreshInterval?: number;
  onJoin: (roomCode: string) => void;
}

export function RoomList({
  status,
  autoRefresh = true,
  refreshInterval = 5000,
  onJoin,
}: RoomListProps) {
  const [rooms, setRooms] = useState<RoomListItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef<boolean>(true);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await listRooms(status);
      setRooms(response.rooms);
      setError('');
    } catch (err) {
      const errorMessage =
        err instanceof APIError ? err.userMessage : '방 목록을 불러오는데 실패했습니다';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [status]);

  // Handle Page Visibility API to pause auto-refresh when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    intervalRef.current = setInterval(() => {
      // Only refresh if page is visible
      if (isVisibleRef.current) {
        fetchRooms();
      }
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchRooms]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchRooms();
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    fetchRooms();
  };

  // Loading skeleton
  if (loading && rooms.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <LoadingSpinner size="large" message="방 목록을 불러오는 중..." />
      </div>
    );
  }

  // Error state
  if (error && rooms.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '2rem',
          border: '1px solid var(--border-color, #ddd)',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-card, #fff)',
        }}
      >
        <div
          style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
            color: '#dc3545',
            marginBottom: '1rem',
          }}
        >
          ⚠️ {error}
        </div>
        <button
          onClick={handleRetry}
          style={{
            padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
            fontSize: 'clamp(0.875rem, 2vw, 1rem)',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  // Empty state
  if (rooms.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: 'clamp(2rem, 5vw, 3rem)',
          border: '1px solid var(--border-color, #ddd)',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-card, #fff)',
        }}
      >
        <div
          style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            marginBottom: '1rem',
          }}
        >
          🎮
        </div>
        <div
          style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
            color: 'var(--text-secondary, #666)',
            marginBottom: '0.5rem',
          }}
        >
          현재 공개 방이 없습니다
        </div>
        <div
          style={{
            fontSize: 'clamp(0.875rem, 2vw, 1rem)',
            color: 'var(--text-secondary, #6c757d)',
          }}
        >
          새로운 방을 만들어보세요!
        </div>
      </div>
    );
  }

  // Room list
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
            color: 'var(--text-primary, #333)',
          }}
        >
          공개 방 목록
          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
              color: 'var(--text-secondary, #666)',
              fontWeight: 'normal',
            }}
          >
            ({rooms.length}개)
          </span>
        </h2>
        <button
          onClick={handleManualRefresh}
          disabled={loading}
          style={{
            padding: 'clamp(0.5rem, 2vw, 0.625rem) clamp(0.75rem, 2vw, 1rem)',
            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            minHeight: '36px',
          }}
        >
          {loading ? '새로고침 중...' : '🔄 새로고침'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'clamp(0.75rem, 2vw, 1rem)',
          width: '100%',
        }}
      >
        {rooms.map((room) => (
          <RoomListItem key={room.code} room={room} onJoin={onJoin} />
        ))}
      </div>
    </div>
  );
}
