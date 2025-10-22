// T056: Create HomePage with "방 만들기" and "방 참가" buttons
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../services/api';
import { Layout } from '../components/Layout';

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
      navigate(`/lobby/${room.code}`);
    } catch (err: any) {
      setError(err.message || '방 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (!roomCode || roomCode.length !== 6) {
      setError('방 코드는 6자리여야 합니다');
      return;
    }
    navigate(`/lobby/${roomCode.toUpperCase()}`);
  };

  return (
    <Layout>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '2rem' }}>두개의 방, 한개의 폭탄</h2>
        <p style={{ marginBottom: '3rem', color: '#666' }}>
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
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              opacity: isCreating ? 0.6 : 1,
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

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="방 코드 입력 (6자리)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{
                flex: 1,
                padding: '1rem',
                fontSize: '1.2rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            />
            <button
              onClick={handleJoinRoom}
              style={{
                padding: '1rem 2rem',
                fontSize: '1.2rem',
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
