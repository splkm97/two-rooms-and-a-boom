import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayerList } from '../components/PlayerList';
import { NicknameEditor } from '../components/NicknameEditor';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { RoleCard } from '../components/RoleCard';
import { RoomPlayerList } from '../components/RoomPlayerList';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  getRoom,
  joinRoom,
  updateNickname,
  startGame,
  leaveRoom,
  resetGame,
  APIError,
} from '../services/api';
import type {
  Player,
  Room,
  Role,
  TeamColor,
  RoomColor,
  WSMessage,
  RoleAssignedPayload,
} from '../types/game.types';

/**
 * RoomPage - Unified component for lobby, game, and reveal views
 *
 * Uses query parameter ?view=lobby|game|reveal to switch between views.
 * This approach keeps the component mounted during navigation,
 * naturally persisting the WebSocket connection and eliminating
 * the need for localStorage to pass role data between pages.
 */
export function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const view = searchParams.get('view') || 'lobby';

  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Game view state
  const [role, setRole] = useState<Role | null>(null);
  const [team, setTeam] = useState<TeamColor | null>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomColor | null>(null);
  const [redRoomPlayers, setRedRoomPlayers] = useState<Player[]>([]);
  const [blueRoomPlayers, setBlueRoomPlayers] = useState<Player[]>([]);

  // Only connect WebSocket after we have player info
  const { isConnected, lastMessage } = useWebSocket(
    roomCode || '',
    currentPlayer?.id || undefined
  );

  // Ref to track if we're already joining to prevent React Strict Mode double execution
  const isJoiningRef = useRef(false);
  const hasJoinedRef = useRef(false);

  // Initial room join
  useEffect(() => {
    const initializeRoom = async () => {
      if (!roomCode) {
        setError('방 코드가 없습니다');
        setLoading(false);
        return;
      }

      // Prevent duplicate joins from React Strict Mode
      if (isJoiningRef.current || hasJoinedRef.current) {
        return;
      }

      isJoiningRef.current = true;

      try {
        // First, get room info to check if it exists
        const roomData = await getRoom(roomCode);

        // Check if game already started
        if (roomData.status === 'IN_PROGRESS') {
          // If game is in progress, switch to game view
          if (view === 'lobby') {
            setSearchParams({ view: 'game' });
          }
        }

        // Check if we already have a playerId for this room
        const storedPlayerId = localStorage.getItem(`playerId_${roomCode}`);

        let player;
        if (storedPlayerId) {
          // Try to find existing player in room
          const existingPlayer = roomData.players.find((p: any) => p.id === storedPlayerId);
          if (existingPlayer) {
            player = existingPlayer;
          } else {
            // Player ID exists but not in room anymore, join again
            player = await joinRoom(roomCode);
            localStorage.setItem(`playerId_${roomCode}`, player.id);
            localStorage.setItem(`isOwner_${roomCode}`, String(player.isOwner));
          }
        } else {
          // Join the room for the first time
          player = await joinRoom(roomCode);
          localStorage.setItem(`playerId_${roomCode}`, player.id);
          localStorage.setItem(`isOwner_${roomCode}`, String(player.isOwner));
        }

        hasJoinedRef.current = true;
        setCurrentPlayer(player);

        // Fetch updated room data
        const updatedRoom = await getRoom(roomCode);
        setRoom(updatedRoom as any);

        // If game is in progress, load role data
        if (updatedRoom.status === 'IN_PROGRESS' && player) {
          const currentPlayerData = updatedRoom.players.find((p: any) => p.id === player.id);
          if (currentPlayerData?.role) {
            setRole(currentPlayerData.role);
            setTeam(currentPlayerData.team);
            setCurrentRoom(currentPlayerData.currentRoom);

            const redPlayers = updatedRoom.players.filter((p: any) => p.currentRoom === 'RED_ROOM');
            const bluePlayers = updatedRoom.players.filter((p: any) => p.currentRoom === 'BLUE_ROOM');
            setRedRoomPlayers(redPlayers);
            setBlueRoomPlayers(bluePlayers);
          }
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Failed to join room:', err);
        setError(err instanceof APIError ? err.userMessage : '방 입장에 실패했습니다');
        setLoading(false);
      } finally {
        isJoiningRef.current = false;
      }
    };

    initializeRoom();
  }, [roomCode]); // Note: Don't include view or setSearchParams to avoid re-joining

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    console.log('[RoomPage] Received WebSocket message:', lastMessage.type, lastMessage.payload);

    try {
      switch (lastMessage.type) {
        case 'PLAYER_JOINED': {
          const { player } = lastMessage.payload as any;
          setRoom((prev) => {
            if (!prev) return prev;
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

          setCurrentPlayer((prev) => {
            if (!prev || prev.id !== playerId) return prev;
            return { ...prev, nickname: newNickname, isAnonymous: false };
          });
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

          setCurrentPlayer((prev) => {
            if (!prev || prev.id !== newOwner.id) return prev;
            return { ...prev, isOwner: true };
          });
          break;
        }

        case 'GAME_STARTED': {
          console.log('[RoomPage] GAME_STARTED received, switching to game view');
          // Reset loading state
          setIsStarting(false);
          // Switch to game view
          setSearchParams({ view: 'game' });
          break;
        }

        case 'ROLE_ASSIGNED': {
          const payload = lastMessage.payload as RoleAssignedPayload;
          console.log('[RoomPage] ROLE_ASSIGNED received, switching to game view');
          setRole(payload.role);
          setTeam(payload.team);
          setCurrentRoom(payload.currentRoom);

          // Reset loading state and switch to game view
          setIsStarting(false);
          setSearchParams({ view: 'game' });

          // Fetch updated room data to get all players' room assignments
          if (roomCode) {
            getRoom(roomCode).then((roomData) => {
              const redPlayers = roomData.players.filter((p: any) => p.currentRoom === 'RED_ROOM');
              const bluePlayers = roomData.players.filter((p: any) => p.currentRoom === 'BLUE_ROOM');
              setRedRoomPlayers(redPlayers);
              setBlueRoomPlayers(bluePlayers);
            });
          }
          break;
        }

        case 'GAME_RESET': {
          // Switch back to lobby view
          setSearchParams({ view: 'lobby' });
          // Clear game state
          setRole(null);
          setTeam(null);
          setCurrentRoom(null);
          setRedRoomPlayers([]);
          setBlueRoomPlayers([]);
          break;
        }
      }
    } catch (err) {
      console.error('Failed to handle WebSocket message:', err);
    }
  }, [lastMessage, roomCode, setSearchParams]);

  const handleNicknameUpdate = async (newNickname: string) => {
    if (!roomCode || !currentPlayer) {
      throw new Error('방 정보가 없습니다');
    }

    const updatedPlayer = await updateNickname(roomCode, currentPlayer.id, newNickname);
    setCurrentPlayer(updatedPlayer);
  };

  const handleBackToHome = async () => {
    const currentRoomCode = roomCode;
    const currentPlayerId = currentPlayer?.id;

    // Navigate first to prevent WebSocket message interference
    navigate('/');

    // Call leave room API after navigation (fire and forget)
    if (currentRoomCode && currentPlayerId) {
      try {
        await leaveRoom(currentRoomCode, currentPlayerId);
      } catch (err) {
        console.error('Failed to leave room:', err);
      }
    }
  };

  const handleStartGame = async () => {
    if (!roomCode) return;

    if (!room || room.players.length < 6) {
      alert('게임을 시작하려면 최소 6명의 플레이어가 필요합니다');
      return;
    }

    setIsStarting(true);
    try {
      await startGame(roomCode);
      // Navigation will happen automatically via GAME_STARTED WebSocket message
    } catch (err: any) {
      console.error('Failed to start game:', err);
      alert(err instanceof APIError ? err.userMessage : '게임 시작에 실패했습니다');
      setIsStarting(false);
    }
  };

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

  // Loading state
  if (loading) {
    return (
      <Layout>
        <LoadingSpinner size="large" message="방 정보를 불러오는 중..." />
      </Layout>
    );
  }

  // Error state
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

  // Render reveal view (fullscreen role display for information exchange)
  if (view === 'reveal') {
    if (!role || !team) {
      // If no role assigned yet, redirect back to appropriate view
      setSearchParams({ view: room.status === 'IN_PROGRESS' ? 'game' : 'lobby' });
      return null;
    }

    // Spies show opposite team color
    const displayTeam = role.isSpy ? (team === 'RED' ? 'BLUE' : 'RED') : team;
    const bgColor = displayTeam === 'RED' ? '#dc2626' : '#2563eb';
    const textColor = '#ffffff';

    return (
      <div
        className="reveal-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: bgColor,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 'clamp(1rem, 3vw, 2rem)',
        }}
      >
        {/* Back button */}
        <button
          onClick={() => setSearchParams({ view: 'game' })}
          style={{
            position: 'absolute',
            top: 'clamp(0.5rem, 2vw, 1rem)',
            left: 'clamp(0.5rem, 2vw, 1rem)',
            padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: textColor,
            border: `2px solid ${textColor}`,
            borderRadius: '8px',
            fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          ← 돌아가기
        </button>

        {/* Center content - display team color only (hide role details) */}
        <div style={{ textAlign: 'center', maxWidth: '90%', width: '100%' }}>
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              padding: 'clamp(2rem, 8vw, 4rem)',
              borderRadius: '24px',
              border: `4px solid rgba(255, 255, 255, 0.5)`,
            }}
          >
            <h1
              className="reveal-title"
              style={{
                color: textColor,
                fontSize: 'clamp(2.5rem, 12vw, 5rem)',
                fontWeight: 'bold',
                margin: 0,
                textShadow: '3px 3px 6px rgba(0, 0, 0, 0.4)',
                lineHeight: 1.2,
              }}
            >
              {displayTeam === 'RED' ? '레드 팀' : '블루 팀'}
            </h1>
          </div>
        </div>

        {/* Instructions */}
        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
          }}
        >
          <p style={{ margin: 0 }}>
            다른 플레이어에게 이 화면을 보여주세요
          </p>
        </div>
      </div>
    );
  }

  // Render game view
  if (view === 'game') {
    if (!role || !team || !currentRoom) {
      return (
        <Layout>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--text-primary)' }}>게임을 로딩 중입니다...</h2>
            <p style={{ color: 'var(--text-secondary)' }}>역할 배정을 기다리고 있습니다.</p>
            <div style={{ marginTop: '1rem' }}>
              <p style={{ color: isConnected ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                {isConnected ? '✓ 연결됨' : '✗ 연결 끊김'}
              </p>
            </div>
          </div>
        </Layout>
      );
    }

    const playersInMyRoom = currentRoom === 'RED_ROOM' ? redRoomPlayers : blueRoomPlayers;

    return (
      <Layout>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ margin: 0, color: 'var(--text-primary)' }}>게임 진행 중</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              방 코드: <strong>{roomCode}</strong>
            </p>
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

              <button
                onClick={() => setSearchParams({ view: 'reveal' })}
                style={{
                  marginTop: '1rem',
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: team === 'RED' ? '#dc2626' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                📱 정보 교환 화면
              </button>
            </div>

            <div>
              <h2 style={{ marginTop: 0 }}>같은 방에 있는 플레이어</h2>
              <RoomPlayerList
                players={playersInMyRoom}
                roomColor={currentRoom}
                currentPlayerId={currentPlayer.id}
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

          {currentPlayer.isOwner && (
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
      </Layout>
    );
  }

  // Render lobby view (default)
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
              onClick={handleStartGame}
              disabled={isStarting || room.players.length < 6}
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '1rem',
                backgroundColor: room.players.length < 6 ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: room.players.length < 6 || isStarting ? 'not-allowed' : 'pointer',
                opacity: room.players.length < 6 || isStarting ? 0.6 : 1,
              }}
              title={
                room.players.length < 6 ? '최소 6명의 플레이어가 필요합니다' : '게임 시작'
              }
            >
              {isStarting ? '시작 중...' : `게임 시작 (${room.players.length}/${room.maxPlayers})`}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
