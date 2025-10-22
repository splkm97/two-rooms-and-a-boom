import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Player, Role, TeamColor, RoomColor, WSMessage, RoleAssignedPayload } from '../types/game.types';
import { useWebSocket } from '../hooks/useWebSocket';
import { RoleCard } from '../components/RoleCard';
import { RoomPlayerList } from '../components/RoomPlayerList';
import { resetGame } from '../services/api';

// T081: Create GamePage with role card and room assignment display
export function GamePage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [team, setTeam] = useState<TeamColor | null>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomColor | null>(null);
  const [redRoomPlayers] = useState<Player[]>([]);
  const [blueRoomPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const { isConnected, lastMessage } = useWebSocket(roomCode || '');

  // Load player ID and owner status from localStorage
  useEffect(() => {
    const storedPlayerId = localStorage.getItem(`playerId_${roomCode}`);
    const storedIsOwner = localStorage.getItem(`isOwner_${roomCode}`) === 'true';
    if (storedPlayerId) {
      setCurrentPlayerId(storedPlayerId);
      setIsOwner(storedIsOwner);
    }
  }, [roomCode]);

  // T095: Handle reset button click
  const handleResetGame = async () => {
    if (!roomCode) return;

    setIsResetting(true);
    try {
      await resetGame(roomCode);
      // Navigation will happen via GAME_RESET WebSocket message
    } catch (error) {
      console.error('Failed to reset game:', error);
      alert('게임 초기화에 실패했습니다.');
      setIsResetting(false);
    }
  };

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const message = lastMessage as WSMessage;

    switch (message.type) {
      case 'ROLE_ASSIGNED': {
        const payload = message.payload as RoleAssignedPayload;
        setRole(payload.role);
        setTeam(payload.team);
        setCurrentRoom(payload.currentRoom);
        break;
      }
      case 'GAME_STARTED': {
        // Could update game state or show notification
        break;
      }
      case 'GAME_RESET': {
        // T096: Redirect to lobby when game is reset
        navigate(`/lobby/${roomCode}`);
        break;
      }
      default:
        break;
    }
  }, [lastMessage, navigate, roomCode]);

  if (!role || !team || !currentRoom) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>게임을 로딩 중입니다...</h2>
        <p>역할 배정을 기다리고 있습니다.</p>
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: isConnected ? '#10b981' : '#ef4444' }}>
            {isConnected ? '✓ 연결됨' : '✗ 연결 끊김'}
          </p>
        </div>
      </div>
    );
  }

  // Filter players by room
  const playersInMyRoom = currentRoom === 'RED_ROOM' ? redRoomPlayers : blueRoomPlayers;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>게임 진행 중</h1>
        <p style={{ color: '#666' }}>방 코드: {roomCode}</p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <RoleCard role={role} team={team} currentRoom={currentRoom} />
        </div>

        <div>
          <h2 style={{ marginTop: 0 }}>같은 방에 있는 플레이어</h2>
          <RoomPlayerList
            players={playersInMyRoom}
            roomColor={currentRoom}
            currentPlayerId={currentPlayerId}
          />
        </div>
      </div>

      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, color: '#666' }}>
          오프라인에서 다른 플레이어들과 역할 공개, 정보 교환, 카드 교환을 진행하세요.
        </p>
      </div>

      {/* T095: Reset button visible only to room owner */}
      {isOwner && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            onClick={handleResetGame}
            disabled={isResetting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isResetting ? '#6c757d' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: isResetting ? 'not-allowed' : 'pointer',
              opacity: isResetting ? 0.6 : 1,
            }}
          >
            {isResetting ? '초기화 중...' : '🔄 대기실로 돌아가기'}
          </button>
          <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.875rem' }}>
            게임을 종료하고 모든 플레이어를 대기실로 돌려보냅니다
          </p>
        </div>
      )}
    </div>
  );
}
