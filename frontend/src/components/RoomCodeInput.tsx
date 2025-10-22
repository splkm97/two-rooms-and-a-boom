// T057: Create RoomCodeInput component for entering room code
import { useState } from 'react';

interface RoomCodeInputProps {
  onSubmit: (roomCode: string) => void;
}

export function RoomCodeInput({ onSubmit }: RoomCodeInputProps) {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    if (!roomCode || roomCode.length !== 6) {
      setError('방 코드는 6자리여야 합니다');
      return;
    }

    const code = roomCode.toUpperCase().trim();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError('방 코드는 영문자와 숫자만 가능합니다');
      return;
    }

    onSubmit(code);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="방 코드 입력 (6자리)"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
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
          onClick={handleSubmit}
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
          참가
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '0.5rem',
            fontSize: '0.9rem',
            color: '#c00',
            textAlign: 'left',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
