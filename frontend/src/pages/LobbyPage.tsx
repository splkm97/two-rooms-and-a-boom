// T058: Create LobbyPage with player list and WebSocket connection
// T061: Integrate PLAYER_JOINED/PLAYER_LEFT/PLAYER_DISCONNECTED/NICKNAME_CHANGED WebSocket messages
// T062: Add error handling for room not found and game in progress
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayerList } from '../components/PlayerList';
import { NicknameEditor } from '../components/NicknameEditor';
import { useWebSocket } from '../hooks/useWebSocket';
import { getRoom, joinRoom, updateNickname } from '../services/api';
import type { Player, Room } from '../types/game.types';

export function LobbyPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { isConnected, lastMessage } = useWebSocket(roomCode || '');

  // Initial room join
  useEffect(() => {
    const initializeRoom = async () => {
      if (!roomCode) {
        setError('방 코드가 없습니다');
        setLoading(false);
        return;
      }

      try {
        // First, get room info to check if it exists
        const roomData = await getRoom(roomCode);

        // Check if game already started
        if (roomData.status === 'IN_PROGRESS') {
          setError('이미 게임이 시작된 방입니다');
          setLoading(false);
          return;
        }

        // Join the room
        const player = await joinRoom(roomCode);
        setCurrentPlayer(player);

        // Fetch updated room data
        const updatedRoom = await getRoom(roomCode);
        setRoom(updatedRoom as any);

        setLoading(false);
      } catch (err: any) {
        console.error('Failed to join room:', err);
        if (err.code === 'ROOM_NOT_FOUND') {
          setError('방을 찾을 수 없습니다. 방 코드를 확인해주세요.');
        } else if (err.code === 'ROOM_FULL') {
          setError('방이 가득 찼습니다');
        } else if (err.code === 'GAME_ALREADY_STARTED') {
          setError('이미 게임이 시작된 방입니다');
        } else {
          setError(err.message || '방 입장에 실패했습니다');
        }
        setLoading(false);
      }
    };

    initializeRoom();
  }, [roomCode]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage || !room) return;

    try {
      switch (lastMessage.type) {
        case 'PLAYER_JOINED': {
          const { player } = lastMessage.payload as any;
          setRoom((prev) => {
            if (!prev) return prev;
            // Check if player already exists
            const exists = prev.players.some((p) => p.id === player.id);
            if (exists) return prev;
            return {
              ...prev,
              players: [...prev.players, player],
            };
          });
          break;
        }

        case 'PLAYER_LEFT':
        case 'PLAYER_DISCONNECTED': {
          const { playerId } = lastMessage.payload as any;
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.filter((p) => p.id !== playerId),
            };
          });
          break;
        }

        case 'NICKNAME_CHANGED': {
          const { playerId, newNickname } = lastMessage.payload as any;
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map((p) =>
                p.id === playerId ? { ...p, nickname: newNickname, isAnonymous: false } : p
              ),
            };
          });

          // Update current player if it's them
          if (currentPlayer && currentPlayer.id === playerId) {
            setCurrentPlayer((prev) =>
              prev ? { ...prev, nickname: newNickname, isAnonymous: false } : prev
            );
          }
          break;
        }

        case 'OWNER_CHANGED': {
          const { newOwner } = lastMessage.payload as any;
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map((p) => ({
                ...p,
                isOwner: p.id === newOwner.id,
              })),
            };
          });

          // Update current player if they're the new owner
          if (currentPlayer && currentPlayer.id === newOwner.id) {
            setCurrentPlayer((prev) => (prev ? { ...prev, isOwner: true } : prev));
          }
          break;
        }

        case 'GAME_STARTED': {
          // Navigate to game page when game starts
          navigate(`/game/${roomCode}`);
          break;
        }
      }
    } catch (err) {
      console.error('Failed to handle WebSocket message:', err);
    }
  }, [lastMessage, room, currentPlayer, roomCode, navigate]);

  const handleNicknameUpdate = async (newNickname: string) => {
    if (!roomCode || !currentPlayer) {
      throw new Error('방 정보가 없습니다');
    }

    const updatedPlayer = await updateNickname(roomCode, currentPlayer.id, newNickname);
    setCurrentPlayer(updatedPlayer);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>로딩 중...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              padding: '2rem',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ color: '#c00', marginTop: 0 }}>오류</h3>
            <p>{error}</p>
          </div>
          <button
            onClick={handleBackToHome}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            홈으로 돌아가기
          </button>
        </div>
      </Layout>
    );
  }

  if (!room || !currentPlayer) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>방 정보를 불러올 수 없습니다</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>대기실</h2>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>
            방 코드: {roomCode}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
            WebSocket: {isConnected ? '🟢 연결됨' : '🔴 연결 끊김'}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <NicknameEditor
            currentNickname={currentPlayer.nickname}
            onUpdate={handleNicknameUpdate}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <PlayerList players={room.players} currentPlayerId={currentPlayer.id} />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleBackToHome}
            style={{
              flex: 1,
              padding: '0.75rem',
              fontSize: '1rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            나가기
          </button>

          {currentPlayer.isOwner && (
            <button
              disabled
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'not-allowed',
                opacity: 0.6,
              }}
              title="역할 배분 기능은 Phase 4에서 구현됩니다"
            >
              게임 시작 (준비 중)
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
