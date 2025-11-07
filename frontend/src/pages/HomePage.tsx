// T056: Create HomePage with "방 만들기" and "방 참가" buttons
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { RoomList } from '../components/room/RoomList';

export function HomePage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleCreateRoom = () => {
    // Navigate to role config page
    navigate('/config');
  };

  const handleJoinRoom = () => {
    if (!roomCode || roomCode.length !== 6) {
      setError('방 코드는 6자리여야 합니다');
      return;
    }
    navigate(`/room/${roomCode.toUpperCase()}?view=lobby`);
  };

  const handleJoinFromList = (code: string) => {
    navigate(`/room/${code}?view=lobby`);
  };

  return (
    <Layout>
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          padding: '0 1rem',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            marginBottom: 'clamp(1.5rem, 5vw, 2rem)',
            color: '#666',
            fontSize: 'clamp(1rem, 3vw, 1.2rem)',
            marginTop: 'clamp(1rem, 3vw, 2rem)',
            textAlign: 'center',
          }}
        >
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
              maxWidth: '600px',
              margin: '0 auto 1rem',
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'center',
            marginBottom: 'clamp(2rem, 5vw, 3rem)',
          }}
        >
          <button
            onClick={handleCreateRoom}
            style={{
              padding: 'clamp(0.8rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem)',
              fontSize: 'clamp(1rem, 3vw, 1.2rem)',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%',
              maxWidth: '400px',
              minHeight: '44px',
            }}
          >
            방 만들기
          </button>
        </div>

        <div style={{ marginBottom: 'clamp(2rem, 5vw, 3rem)' }}>
          <RoomList onJoin={handleJoinFromList} status="WAITING" />
        </div>

        <div
          style={{
            margin: 'clamp(2rem, 5vw, 3rem) 0',
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
            color: '#999',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
          <span>또는</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            maxWidth: '400px',
            margin: '0 auto',
          }}
        >
          <h3
            style={{
              margin: '0 0 0.5rem',
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
              color: 'var(--text-primary, #333)',
              textAlign: 'center',
            }}
          >
            방 코드로 직접 참가
          </h3>
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
              minHeight: '50px',
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
              minHeight: '44px',
            }}
          >
            방 참가
          </button>
        </div>
      </div>
    </Layout>
  );
}
