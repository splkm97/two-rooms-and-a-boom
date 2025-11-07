import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type {
  Player,
  Role,
  TeamColor,
  RoomColor,
  WSMessage,
  RoleAssignedPayload,
} from '../types/game.types';
import { useWebSocket } from '../hooks/useWebSocket';
import { RoleCard } from '../components/role/RoleCard';
import { RoomPlayerList } from '../components/room/RoomPlayerList';
import { resetGame, getRoom } from '../services/api';

// T081: Create GamePage with role card and room assignment display
export function GamePage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [team, setTeam] = useState<TeamColor | null>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomColor | null>(null);
  const [redRoomPlayers, setRedRoomPlayers] = useState<Player[]>([]);
  const [blueRoomPlayers, setBlueRoomPlayers] = useState<Player[]>([]);
  // Load player ID and owner status from localStorage BEFORE useWebSocket
  const storedPlayerId = localStorage.getItem(`playerId_${roomCode}`);
  const storedIsOwner = localStorage.getItem(`isOwner_${roomCode}`) === 'true';

  const [currentPlayerId, setCurrentPlayerId] = useState<string>(storedPlayerId || '');
  const [isOwner, setIsOwner] = useState<boolean>(storedIsOwner);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const { isConnected, lastMessage } = useWebSocket(roomCode || '', currentPlayerId || undefined);

  // Update state if roomCode changes
  useEffect(() => {
    const newPlayerId = localStorage.getItem(`playerId_${roomCode}`);
    const newIsOwner = localStorage.getItem(`isOwner_${roomCode}`) === 'true';
    if (newPlayerId) {
      setCurrentPlayerId(newPlayerId);
      setIsOwner(newIsOwner);
    }
  }, [roomCode]);

  // Fetch role data on initial load (in case GAME_STARTED was missed)
  useEffect(() => {
    const fetchInitialRoleData = async () => {
      if (!roomCode || !currentPlayerId) return;
      if (role && team && currentRoom) return; // Already have role data

      // First, try to load from localStorage (set by RoomPage when ROLE_ASSIGNED received)
      console.log('[GamePage] Checking localStorage for roomCode:', roomCode);
      const storedRole = localStorage.getItem(`role_${roomCode}`);
      const storedTeam = localStorage.getItem(`team_${roomCode}`);
      const storedCurrentRoom = localStorage.getItem(`currentRoom_${roomCode}`);
      console.log('[GamePage] localStorage data:', { storedRole, storedTeam, storedCurrentRoom });

      if (storedRole && storedTeam && storedCurrentRoom) {
        console.log('[GamePage] Loading role data from localStorage');
        setRole(JSON.parse(storedRole));
        setTeam(storedTeam as TeamColor);
        setCurrentRoom(storedCurrentRoom as RoomColor);

        // Still fetch room data to get all players' room assignments
        try {
          const roomData = await getRoom(roomCode);
          const redPlayers = roomData.players.filter((p: Player) => p.currentRoom === 'RED_ROOM');
          const bluePlayers = roomData.players.filter((p: Player) => p.currentRoom === 'BLUE_ROOM');
          setRedRoomPlayers(redPlayers);
          setBlueRoomPlayers(bluePlayers);
        } catch (error) {
          console.error('[GamePage] Failed to fetch room players:', error);
        }
        return;
      }

      // If not in localStorage, fetch from API
      try {
        console.log('[GamePage] Fetching initial role data for:', roomCode, currentPlayerId);
        const roomData = await getRoom(roomCode);
        console.log('[GamePage] Initial room data received:', roomData);

        // Check if game has started
        if (roomData.status !== 'IN_PROGRESS') {
          console.log('[GamePage] Game not started yet, redirecting to lobby');
          navigate(`/lobby/${roomCode}`);
          return;
        }

        const currentPlayer = roomData.players.find((p: Player) => p.id === currentPlayerId);
        console.log('[GamePage] Current player found:', currentPlayer);

        if (currentPlayer?.role) {
          console.log(
            '[GamePage] Setting initial role:',
            currentPlayer.role,
            currentPlayer.team,
            currentPlayer.currentRoom
          );
          setRole(currentPlayer.role);
          setTeam(currentPlayer.team ?? null);
          setCurrentRoom(currentPlayer.currentRoom ?? null);

          // Save role info to localStorage for reveal page
          localStorage.setItem(`role_${roomCode}`, JSON.stringify(currentPlayer.role));
          if (currentPlayer.team) {
            localStorage.setItem(`team_${roomCode}`, currentPlayer.team);
          }

          // Set room players
          const redPlayers = roomData.players.filter((p: Player) => p.currentRoom === 'RED_ROOM');
          const bluePlayers = roomData.players.filter((p: Player) => p.currentRoom === 'BLUE_ROOM');
          console.log(
            '[GamePage] Red room players:',
            redPlayers.length,
            'Blue room players:',
            bluePlayers.length
          );
          setRedRoomPlayers(redPlayers);
          setBlueRoomPlayers(bluePlayers);
        } else {
          console.error('[GamePage] Player has no role assigned');
        }
      } catch (error) {
        console.error('[GamePage] Failed to fetch initial role data:', error);
      }
    };

    fetchInitialRoleData();
  }, [roomCode, currentPlayerId, role, team, currentRoom, navigate]);

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
    console.log('[GamePage] Received WebSocket message:', message.type, message);

    switch (message.type) {
      case 'ROLE_ASSIGNED': {
        const payload = message.payload as RoleAssignedPayload;
        setRole(payload.role);
        setTeam(payload.team);
        setCurrentRoom(payload.currentRoom);
        break;
      }
      case 'GAME_STARTED': {
        console.log('[GamePage] GAME_STARTED received, currentPlayerId:', currentPlayerId);
        // Fetch room data to get player role
        const fetchRoleData = async () => {
          if (!roomCode) {
            console.error('[GamePage] No roomCode available');
            return;
          }
          if (!currentPlayerId) {
            console.error('[GamePage] No currentPlayerId available');
            return;
          }

          try {
            console.log('[GamePage] Fetching room data for:', roomCode);
            const roomData = await getRoom(roomCode);
            console.log('[GamePage] Room data received:', roomData);
            const currentPlayer = roomData.players.find((p: Player) => p.id === currentPlayerId);
            console.log('[GamePage] Current player:', currentPlayer);
            if (currentPlayer?.role) {
              console.log(
                '[GamePage] Setting role:',
                currentPlayer.role,
                currentPlayer.team,
                currentPlayer.currentRoom
              );
              setRole(currentPlayer.role);
              setTeam(currentPlayer.team ?? null);
              setCurrentRoom(currentPlayer.currentRoom ?? null);

              // Save role info to localStorage for reveal page
              localStorage.setItem(`role_${roomCode}`, JSON.stringify(currentPlayer.role));
              if (currentPlayer.team) {
                localStorage.setItem(`team_${roomCode}`, currentPlayer.team);
              }

              // Set room players
              const redPlayers = roomData.players.filter((p: Player) => p.currentRoom === 'RED_ROOM');
              const bluePlayers = roomData.players.filter(
                (p: Player) => p.currentRoom === 'BLUE_ROOM'
              );
              console.log(
                '[GamePage] Red room players:',
                redPlayers.length,
                'Blue room players:',
                bluePlayers.length
              );
              setRedRoomPlayers(redPlayers);
              setBlueRoomPlayers(bluePlayers);
            } else {
              console.error('[GamePage] Player has no role assigned');
            }
          } catch (error) {
            console.error('[GamePage] Failed to fetch role data:', error);
          }
        };
        fetchRoleData();
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
  }, [lastMessage, navigate, roomCode, currentPlayerId]);

  if (!role || !team || !currentRoom) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>게임을 로딩 중입니다...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>역할 배정을 기다리고 있습니다.</p>
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: isConnected ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
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

          {/* 역할 공개 버튼 */}
          <button
            onClick={() => navigate(`/reveal/${roomCode}`)}
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
