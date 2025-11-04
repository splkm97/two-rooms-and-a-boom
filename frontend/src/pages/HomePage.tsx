// T056: Create HomePage with "방 만들기" and "방 참가" buttons
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, APIError } from '../services/api';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function HomePage() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError('');
    try {
      const room = await createRoom(10); // Default 10 players
      navigate(`/room/${room.code}?view=lobby`);
    } catch (err: any) {
      // T105, T106: Use user-friendly Korean error message
      setError(err instanceof APIError ? err.userMessage : '방 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (!roomCode || roomCode.length !== 6) {
      setError('방 코드는 6자리여야 합니다');
      return;
    }
    navigate(`/room/${roomCode.toUpperCase()}?view=lobby`);
  };

  return (
    <Layout>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
        width: '100%',
        padding: '0 1rem',
        boxSizing: 'border-box',
      }}>
        <p style={{
          marginBottom: 'clamp(1.5rem, 5vw, 3rem)',
          color: '#666',
          fontSize: 'clamp(1rem, 3vw, 1.2rem)',
          marginTop: 'clamp(1rem, 3vw, 2rem)',
        }}>
          역할 배분 시스템에 오신 것을 환영합니다
        </p>

        {error && (
          <div
            style={{
              padding: '1rem',
              marginBottom: '1rem',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
              color: '#c00',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            style={{
              padding: 'clamp(0.8rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem)',
              fontSize: 'clamp(1rem, 3vw, 1.2rem)',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              opacity: isCreating ? 0.6 : 1,
              width: '100%',
              maxWidth: '400px',
            }}
          >
            {isCreating ? '생성 중...' : '방 만들기'}
          </button>

          <div
            style={{
              margin: '1rem 0',
              fontSize: '1rem',
              color: '#999',
            }}
          >
            또는
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            width: '100%',
            maxWidth: '400px',
          }}>
            <input
              type="text"
              placeholder="방 코드 입력 (6자리)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{
                width: '100%',
                padding: 'clamp(0.8rem, 2vw, 1rem)',
                fontSize: 'clamp(1rem, 3vw, 1.2rem)',
                border: '1px solid #ddd',
                borderRadius: '8px',
                textAlign: 'center',
                textTransform: 'uppercase',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleJoinRoom}
              style={{
                width: '100%',
                padding: 'clamp(0.8rem, 2vw, 1rem)',
                fontSize: 'clamp(1rem, 3vw, 1.2rem)',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              방 참가
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
