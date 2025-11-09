import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { PlayerList } from '../components/game/PlayerList';
import { NicknameEditor } from '../components/game/NicknameEditor';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { RoleCard } from '../components/role/RoleCard';
import { RoomPlayerList } from '../components/room/RoomPlayerList';
import { RoleListSidebar } from '../components/role/RoleListSidebar';
import { RoundTimer } from '../components/game/RoundTimer';
import { RoundTimerPanel } from '../components/game/RoundTimerPanel';
import { LeaderTransferModal } from '../components/game/LeaderTransferModal';
import { ExchangeAnimation } from '../components/game/ExchangeAnimation';
import { RoundHistory } from '../components/game/RoundHistory';
import { VotePage } from '../components/game/VotePage';
import { RevealPage } from '../components/game/RevealPage';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  getRoom,
  joinRoom,
  updateNickname,
  startGame,
  leaveRoom,
  resetGame,
  transferLeadership,
  getCurrentRound,
  startVote,
  castVote,
  getCurrentVote,
  APIError,
} from '../services/api';
import type {
  Player,
  Room,
  Role,
  TeamColor,
  RoomColor,
  RoleAssignedPayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  PlayerDisconnectedPayload,
  NicknameChangedPayload,
  OwnerChangedPayload,
  RoundStartedPayload,
  TimerTickPayload,
  RoundEndedPayload,
  RoundEndingPayload,
  LeaderReadyPayload,
  GameRevealingPayload,
  LeadershipChangedPayload,
  LeaderAnnouncedHostagesPayload,
  ExchangeCompletePayload,
  ExchangeRecord,
  LeaderInfo,
  VoteSession,
  VoteSessionStartedPayload,
  VoteProgressPayload,
  VoteResultPayload,
  VoteChoice,
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Game view state
  const [role, setRole] = useState<Role | null>(null);
  const [team, setTeam] = useState<TeamColor | null>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomColor | null>(null);
  const [redRoomPlayers, setRedRoomPlayers] = useState<Player[]>([]);
  const [blueRoomPlayers, setBlueRoomPlayers] = useState<Player[]>([]);

  // Reveal view state
  const [revealMode, setRevealMode] = useState<'color' | 'full'>('color');

  // Round state
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [totalRoundTime, setTotalRoundTime] = useState<number>(180);
  const [redLeader, setRedLeader] = useState<LeaderInfo | null>(null);
  const [blueLeader, setBlueLeader] = useState<LeaderInfo | null>(null);

  // Leader transfer state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [canTransferLeadership, setCanTransferLeadership] = useState(true);

  // Vote state
  const [activeVoteSession, setActiveVoteSession] = useState<VoteSession | null>(null);
  const [voteResult, setVoteResult] = useState<VoteResultPayload | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  // Exchange state
  const [showExchangeAnimation, setShowExchangeAnimation] = useState(false);
  const [exchangeRecords, setExchangeRecords] = useState<ExchangeRecord[]>([]);

  // History state
  const [historyEvents, setHistoryEvents] = useState<
    Array<{
      type: 'exchange' | 'leadership_change';
      roundNumber: number;
      timestamp: string;
      data: ExchangeRecord | LeadershipChangedPayload;
    }>
  >([]);

  // Only connect WebSocket after we have player info
  const { isConnected, lastMessage, sendMessage } = useWebSocket(
    roomCode || '',
    currentPlayer?.id || undefined
  );

  // Ref to track if we're already joining to prevent React Strict Mode double execution
  const isJoiningRef = useRef(false);

  // Ref to track if we've already processed ROLE_ASSIGNED to prevent duplicate processing
  const roleAssignedProcessedRef = useRef(false);
  const hasJoinedRef = useRef(false);

  // Ref to track which rounds have shown exchange animations (persists across re-renders)
  const shownExchangeRoundsRef = useRef<Set<number>>(new Set());

  // Ref to track last processed message to prevent duplicate processing
  const lastProcessedMessageRef = useRef<string>('');

  // Function to fetch and update room state
  const fetchRoom = async () => {
    if (!roomCode || !currentPlayer) return;

    try {
      const roomData = await getRoom(roomCode);
      setRoom(roomData as Room);

      // Update player data if game is in progress
      if (roomData.status === 'IN_PROGRESS' || roomData.status === 'REVEALING') {
        const currentPlayerData = roomData.players.find((p: Player) => p.id === currentPlayer.id);
        if (currentPlayerData) {
          setRole(currentPlayerData.role || null);
          setTeam(currentPlayerData.team || null);
          setCurrentRoom(currentPlayerData.currentRoom || null);

          const redPlayers = roomData.players.filter((p: Player) => p.currentRoom === 'RED_ROOM');
          const bluePlayers = roomData.players.filter((p: Player) => p.currentRoom === 'BLUE_ROOM');
          setRedRoomPlayers(redPlayers);
          setBlueRoomPlayers(bluePlayers);
        }
      }
    } catch (err) {
      console.error('[ERROR] Failed to fetch room:', err);
    }
  };

  // Periodic refresh - poll every 3 seconds
  useEffect(() => {
    if (!roomCode || !currentPlayer) return;

    const intervalId = setInterval(() => {
      fetchRoom();
    }, 3000); // 3 seconds

    return () => clearInterval(intervalId);
  }, [roomCode, currentPlayer?.id]);

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
        console.log('[DEBUG] storedPlayerId:', storedPlayerId);
        console.log('[DEBUG] roomData.players:', roomData.players.map((p: Player) => ({id: p.id, nickname: p.nickname})));

        let player;
        if (storedPlayerId) {
          // Try to find existing player in room
          const existingPlayer = roomData.players.find((p: Player) => p.id === storedPlayerId);
          console.log('[DEBUG] existingPlayer found:', existingPlayer ? 'YES' : 'NO');
          if (existingPlayer) {
            console.log('[DEBUG] Using existing player:', existingPlayer.id, existingPlayer.nickname);
            player = existingPlayer;
          } else {
            console.log('[DEBUG] Player not in room, calling joinRoom()');
            // Player ID exists but not in room anymore, join again
            player = await joinRoom(roomCode);
            localStorage.setItem(`playerId_${roomCode}`, player.id);
            localStorage.setItem(`isOwner_${roomCode}`, String(player.isOwner));
          }
        } else {
          console.log('[DEBUG] No storedPlayerId, calling joinRoom()');
          // Join the room for the first time
          player = await joinRoom(roomCode);
          localStorage.setItem(`playerId_${roomCode}`, player.id);
          localStorage.setItem(`isOwner_${roomCode}`, String(player.isOwner));
        }

        hasJoinedRef.current = true;
        setCurrentPlayer(player);

        // Fetch updated room data
        const updatedRoom = await getRoom(roomCode);
        setRoom(updatedRoom as Room);

        // If game is in progress, load role data and round state
        if (updatedRoom.status === 'IN_PROGRESS' && player) {
          const currentPlayerData = updatedRoom.players.find((p: Player) => p.id === player.id);
          if (currentPlayerData?.role) {
            setRole(currentPlayerData.role);
            setTeam(currentPlayerData.team || null);
            setCurrentRoom(currentPlayerData.currentRoom || null);

            const redPlayers = updatedRoom.players.filter((p: Player) => p.currentRoom === 'RED_ROOM');
            const bluePlayers = updatedRoom.players.filter(
              (p: Player) => p.currentRoom === 'BLUE_ROOM'
            );
            setRedRoomPlayers(redPlayers);
            setBlueRoomPlayers(bluePlayers);

            // Fetch current round state to restore leader information
            let hasActiveVote = false;
            try {
              const roundState = await getCurrentRound(roomCode);
              setCurrentRound(roundState.roundNumber);
              setTimeRemaining(roundState.timeRemaining);
              setTotalRoundTime(roundState.duration);

              // Find leader players from the room data
              if (roundState.redLeader) {
                const redLeaderPlayer = updatedRoom.players.find((p: Player) => p.id === roundState.redLeader);
                if (redLeaderPlayer) {
                  setRedLeader({ id: redLeaderPlayer.id, nickname: redLeaderPlayer.nickname });
                }
              }

              if (roundState.blueLeader) {
                const blueLeaderPlayer = updatedRoom.players.find((p: Player) => p.id === roundState.blueLeader);
                if (blueLeaderPlayer) {
                  setBlueLeader({ id: blueLeaderPlayer.id, nickname: blueLeaderPlayer.nickname });
                }
              }

              // Restore active vote session if exists
              if (currentPlayerData.currentRoom) {
                try {
                  const voteData = await getCurrentVote(roomCode, currentPlayerData.currentRoom);
                  if (voteData.activeVote) {
                    hasActiveVote = true;
                    setActiveVoteSession({
                      voteID: voteData.activeVote.voteId,
                      roomColor: voteData.activeVote.roomColor as RoomColor,
                      voteType: voteData.activeVote.voteType,
                      targetLeaderId: voteData.activeVote.targetLeaderId,
                      targetLeaderName: voteData.activeVote.targetLeaderName,
                      initiatorId: voteData.activeVote.initiatorId,
                      initiatorName: voteData.activeVote.initiatorName,
                      candidates: voteData.activeVote.candidates,
                      totalVoters: voteData.activeVote.totalVoters,
                      votedCount: voteData.activeVote.votedCount,
                      timeoutSeconds: voteData.activeVote.timeoutSeconds,
                      status: 'ACTIVE',
                      gameSessionId: '',
                      startedAt: voteData.activeVote.startedAt,
                      expiresAt: '',
                    });
                    setHasVoted(false);
                    setVoteResult(null);
                    setCanTransferLeadership(false);
                    // Always navigate to ?view=vote (VotePage handles both REMOVAL and ELECTION)
                    setSearchParams({ view: 'vote' });
                  }
                } catch (err) {
                  console.error('Failed to restore vote session:', err);
                }
              }
            } catch (err) {
              console.error('Failed to fetch round state:', err);
            }

            // Switch to game view only if there's no active vote
            if (!hasActiveVote) {
              setSearchParams({ view: 'game' });
            }

            // Restore history from localStorage
            try {
              const savedHistory = localStorage.getItem(`history_${roomCode}`);
              if (savedHistory) {
                const parsedHistory = JSON.parse(savedHistory);
                setHistoryEvents(parsedHistory);
              }
            } catch (err) {
              console.error('Failed to restore history:', err);
            }
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('[ERROR] Failed to initialize room:', err);
        if (err instanceof Error) {
          console.error('[ERROR] Error message:', err.message);
          console.error('[ERROR] Error stack:', err.stack);
        }
        setError(err instanceof APIError ? err.userMessage : '방 입장에 실패했습니다');
        setLoading(false);
      } finally {
        isJoiningRef.current = false;
      }
    };

    initializeRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]); // Note: Don't include view or setSearchParams to avoid re-joining

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (roomCode && historyEvents.length > 0) {
      try {
        localStorage.setItem(`history_${roomCode}`, JSON.stringify(historyEvents));
      } catch (err) {
        console.error('Failed to save history:', err);
      }
    }
  }, [roomCode, historyEvents]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    // Create a unique ID for this message to prevent duplicate processing
    const messageId = JSON.stringify(lastMessage);
    if (lastProcessedMessageRef.current === messageId) {
      console.log('[WebSocket] Skipping duplicate message:', lastMessage.type);
      return;
    }
    lastProcessedMessageRef.current = messageId;

    try {
      console.log('[WebSocket] Received message:', lastMessage.type, lastMessage.payload);
      switch (lastMessage.type) {
        case 'PLAYER_JOINED': {
          const { player } = lastMessage.payload as PlayerJoinedPayload;
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
          const { playerId } = lastMessage.payload as PlayerLeftPayload | PlayerDisconnectedPayload;
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
          const { playerId, newNickname } = lastMessage.payload as NicknameChangedPayload;
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
          const { newOwner } = lastMessage.payload as OwnerChangedPayload;
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
          // Reset loading state
          setIsStarting(false);
          // Switch to game view
          setSearchParams({ view: 'game' });
          break;
        }

        case 'ROLE_ASSIGNED': {
          // Prevent duplicate processing
          if (roleAssignedProcessedRef.current) {
            break;
          }
          roleAssignedProcessedRef.current = true;

          const payload = lastMessage.payload as RoleAssignedPayload;

          // Reset loading state first
          setIsStarting(false);

          // Set role data - these updates are batched by React
          setRole(payload.role);
          setTeam(payload.team);
          setCurrentRoom(payload.currentRoom);

          // Save role data to localStorage as backup
          if (roomCode) {
            localStorage.setItem(`role_${roomCode}`, JSON.stringify(payload.role));
            localStorage.setItem(`team_${roomCode}`, payload.team);
            localStorage.setItem(`currentRoom_${roomCode}`, payload.currentRoom);
          }

          // Switch to game view in the next tick after state updates
          setTimeout(() => {
            setSearchParams({ view: 'game' });
          }, 0);

          // Fetch updated room data to get all players' room assignments
          if (roomCode) {
            getRoom(roomCode).then((roomData) => {
              const redPlayers = roomData.players.filter((p: Player) => p.currentRoom === 'RED_ROOM');
              const bluePlayers = roomData.players.filter(
                (p: Player) => p.currentRoom === 'BLUE_ROOM'
              );
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
          // Reset round state
          setCurrentRound(0);
          setTimeRemaining(0);
          setRedLeader(null);
          setBlueLeader(null);
          setHistoryEvents([]);
          // Clear history from localStorage
          if (roomCode) {
            localStorage.removeItem(`history_${roomCode}`);
          }
          // Reset the role assigned flag so next game can process it
          roleAssignedProcessedRef.current = false;
          break;
        }

        // Round management events
        case 'ROUND_STARTED': {
          const payload = lastMessage.payload as RoundStartedPayload;
          setCurrentRound(payload.roundNumber);
          setTimeRemaining(payload.timeRemaining);
          setTotalRoundTime(payload.duration);
          setRedLeader(payload.redLeader);
          setBlueLeader(payload.blueLeader);
          setCanTransferLeadership(true);
          break;
        }

        case 'TIMER_TICK': {
          const payload = lastMessage.payload as TimerTickPayload;
          setTimeRemaining(payload.timeRemaining);
          break;
        }

        case 'ROUND_ENDED': {
          const payload = lastMessage.payload as RoundEndedPayload;
          // Round ended, prepare for next round or reveal
          if (payload.finalRound) {
            // Game is over, will transition to reveal
            setCurrentRound(0);
          }
          break;
        }

        case 'ROUND_ENDING': {
          const payload = lastMessage.payload as RoundEndingPayload;
          console.log(`Round ${payload.roundNumber} ending, select ${payload.hostageCount} hostages`);
          // Trigger UI update - roundState will be updated via room state
          break;
        }

        case 'LEADER_READY': {
          const payload = lastMessage.payload as LeaderReadyPayload;
          console.log(`Leader ready: ${payload.leaderId} from ${payload.roomColor}`);
          if (payload.bothReady) {
            console.log('Both leaders ready, next round starting soon!');
          }
          // Trigger UI update
          break;
        }

        case 'GAME_REVEALING': {
          const payload = lastMessage.payload as GameRevealingPayload;
          console.log(payload.message);
          // Fetch updated room state to reflect REVEALING status
          fetchRoom();
          break;
        }

        // Leader management events
        case 'LEADERSHIP_CHANGED': {
          const payload = lastMessage.payload as LeadershipChangedPayload;
          if (payload.roomColor === 'RED_ROOM') {
            setRedLeader(payload.newLeader);
          } else {
            setBlueLeader(payload.newLeader);
          }

          // Add to history (check for duplicates by timestamp)
          setHistoryEvents((prev) => {
            const exists = prev.some(
              (event) =>
                event.type === 'leadership_change' &&
                event.timestamp === payload.timestamp &&
                (event.data as LeadershipChangedPayload).roomColor === payload.roomColor
            );
            if (exists) return prev;

            return [
              ...prev,
              {
                type: 'leadership_change',
                roundNumber: currentRound,
                timestamp: payload.timestamp,
                data: payload,
              },
            ];
          });

          // Close transfer modal if open
          setShowTransferModal(false);

          // If this was from a vote (VOTE_REMOVAL reason), redirect to game view
          if (payload.reason === 'VOTE_REMOVAL') {
            // Clear vote state
            setActiveVoteSession(null);
            setHasVoted(false);
            setVoteResult(null);
            // Redirect to game view
            setSearchParams({ view: 'game' });
          }
          break;
        }

        // Vote events
        case 'VOTE_SESSION_STARTED': {
          const payload = lastMessage.payload as VoteSessionStartedPayload;
          // Detect vote type: ELECTION if candidates array exists and has items, otherwise REMOVAL
          const isElection = payload.candidates && payload.candidates.length > 0;
          console.log('[VOTE_SESSION_STARTED] isElection:', isElection, 'candidates:', payload.candidates);

          setActiveVoteSession({
            voteID: payload.voteId, // Note: backend sends camelCase 'voteId'
            roomColor: payload.roomColor,
            voteType: isElection ? 'ELECTION' : 'REMOVAL',
            targetLeaderId: payload.targetLeader?.id || '',
            targetLeaderName: payload.targetLeader?.nickname || '',
            initiatorId: payload.initiator?.id || '',
            initiatorName: payload.initiator?.nickname || '',
            candidates: payload.candidates || [], // Use candidates from backend
            totalVoters: payload.totalVoters,
            votedCount: 0,
            timeoutSeconds: payload.timeoutSeconds,
            status: 'ACTIVE',
            gameSessionId: '',
            startedAt: payload.startedAt,
            expiresAt: '',
          });
          setHasVoted(false);
          setVoteResult(null);
          setCanTransferLeadership(false);

          // Always navigate to ?view=vote (VotePage handles both REMOVAL and ELECTION)
          setSearchParams({ view: 'vote' });
          break;
        }

        case 'VOTE_PROGRESS': {
          const payload = lastMessage.payload as VoteProgressPayload;
          setActiveVoteSession((prev) =>
            prev
              ? {
                  ...prev,
                  votedCount: payload.votedCount,
                }
              : null
          );
          break;
        }

        case 'VOTE_COMPLETED': {
          const payload = lastMessage.payload as VoteResultPayload;
          console.log('[VOTE_COMPLETED] Received:', payload);
          setVoteResult(payload);
          setCanTransferLeadership(true);

          // Always navigate back to game after 3 seconds
          // If removal PASSED, election will auto-start and navigate to ?view=election
          console.log('[VOTE_COMPLETED] Will navigate back to game in 3s');
          setTimeout(() => {
            setSearchParams({ view: 'game' });
            setActiveVoteSession(null);
            setVoteResult(null);
            setHasVoted(false);
          }, 3000);
          break;
        }

        // Exchange events
        case 'LEADER_ANNOUNCED_HOSTAGES': {
          const payload = lastMessage.payload as LeaderAnnouncedHostagesPayload;
          // UI update handled by roundState
          console.log(`Hostages announced for ${payload.roomColor}`);
          break;
        }

        case 'EXCHANGE_COMPLETE': {
          const payload = lastMessage.payload as ExchangeCompletePayload;

          // Only show animation if:
          // 1. We haven't shown it for this round yet
          // 2. We've shown fewer than 2 animations total
          const alreadyShown = shownExchangeRoundsRef.current.has(payload.roundNumber);
          const canShowMore = shownExchangeRoundsRef.current.size < 2;

          if (!alreadyShown && canShowMore) {
            shownExchangeRoundsRef.current.add(payload.roundNumber);
            setExchangeRecords(payload.exchanges);
            console.log('[DEBUG] Setting showExchangeAnimation = TRUE for round', payload.roundNumber,
                       'Total shown:', shownExchangeRoundsRef.current.size);
            setShowExchangeAnimation(true);
          } else {
            console.log('[DEBUG] Exchange animation skipped for round', payload.roundNumber,
                       'Already shown:', alreadyShown, 'Can show more:', canShowMore,
                       'Total shown:', shownExchangeRoundsRef.current.size);
          }

          // Add exchanges to history (check for duplicates)
          const newHistoryEvents = payload.exchanges.map((exchange) => ({
            type: 'exchange' as const,
            roundNumber: payload.roundNumber,
            timestamp: exchange.timestamp,
            data: exchange,
          }));

          setHistoryEvents((prev) => {
            // Filter out events that already exist (by playerID + timestamp)
            const filteredNew = newHistoryEvents.filter((newEvent) => {
              return !prev.some(
                (existingEvent) =>
                  existingEvent.type === 'exchange' &&
                  existingEvent.timestamp === newEvent.timestamp &&
                  (existingEvent.data as ExchangeRecord).playerId ===
                    (newEvent.data as ExchangeRecord).playerId
              );
            });

            return [...prev, ...filteredNew];
          });
          break;
        }
      }
    } catch {
      // Error handling
    }
  }, [lastMessage, roomCode, setSearchParams, navigate, currentRound, currentPlayer, redLeader, blueLeader, redRoomPlayers, blueRoomPlayers]);

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
      } catch {
        // Error handled silently
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
    } catch (err) {
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
    } catch {
      alert('게임 초기화에 실패했습니다.');
      setIsResetting(false);
    }
  };

  // Round-based handlers
  const handleSelectHostages = async (hostageIds: string[]) => {
    if (!room || !currentPlayer) return;

    try {
      const response = await fetch(
        `http://localhost:8080/api/v1/rooms/${room.code}/hostages/select`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Player-ID': currentPlayer.id,
          },
          body: JSON.stringify({
            hostageIds: hostageIds,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to select hostages');
      }

      console.log('Hostages selected successfully');
      // The LEADER_ANNOUNCED_HOSTAGES WebSocket event will update the UI
    } catch (error) {
      console.error('Failed to select hostages:', error);
      alert('인질 선택에 실패했습니다');
    }
  };

  const handleLeaderReady = async () => {
    if (!room) return;

    try {
      const response = await fetch(
        `http://localhost:8080/api/v1/rooms/${room.code}/rounds/ready`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Player-ID': currentPlayer?.id || '',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark ready');
      }

      console.log('Leader marked as ready');
    } catch (error) {
      console.error('Failed to mark leader ready:', error);
      alert('준비 완료 처리에 실패했습니다');
    }
  };

  const handleTransferLeadership = async (newLeaderId: string) => {
    if (!roomCode || !currentPlayer?.id) return;

    try {
      await transferLeadership(roomCode, currentPlayer.id, newLeaderId);
      setShowTransferModal(false);
      // The WebSocket LEADERSHIP_CHANGED event will update the UI
    } catch (error) {
      console.error('Failed to transfer leadership:', error);
      alert('리더 이양에 실패했습니다.');
    }
  };

  const handleStartVote = async () => {
    if (!currentRoom || !roomCode || !currentPlayer) return;

    const leader = currentRoom === 'RED_ROOM' ? redLeader : blueLeader;
    if (!leader) {
      alert('리더가 없습니다.');
      return;
    }

    try {
      await startVote(roomCode, currentPlayer.id, currentRoom, leader.id);
      // Vote session will start via WebSocket event
    } catch (error) {
      console.error('Failed to start vote:', error);
      alert(error instanceof APIError ? error.userMessage : '투표 시작에 실패했습니다.');
    }
  };

  const handleVote = async (vote: VoteChoice | string) => {
    if (!activeVoteSession || !roomCode || !currentPlayer) return;

    try {
      await castVote(roomCode, activeVoteSession.voteID, currentPlayer.id, vote);
      setHasVoted(true);
    } catch (error) {
      console.error('Failed to cast vote:', error);
      alert(error instanceof APIError ? error.userMessage : '투표에 실패했습니다.');
    }
  };

  const handleExchangeAnimationComplete = () => {
    console.log('[DEBUG] Exchange animation completed, hiding overlay');
    setShowExchangeAnimation(false);

    // Update player lists after exchange
    if (roomCode) {
      getRoom(roomCode).then((roomData) => {
        const redPlayers = roomData.players.filter((p: Player) => p.currentRoom === 'RED_ROOM');
        const bluePlayers = roomData.players.filter((p: Player) => p.currentRoom === 'BLUE_ROOM');
        setRedRoomPlayers(redPlayers);
        setBlueRoomPlayers(bluePlayers);

        // Update current player's room if they were exchanged
        const updatedCurrentPlayer = roomData.players.find((p: Player) => p.id === currentPlayer?.id);
        if (updatedCurrentPlayer?.currentRoom) {
          setCurrentRoom(updatedCurrentPlayer.currentRoom);
        }
      });
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

  // Show reveal page if game is in revealing phase (after Round 3)
  if (room.status === 'REVEALING') {
    return (
      <Layout>
        <RevealPage players={room.players} roomCode={room.code} />
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

    // Color mode: Spies show opposite team color
    // Full mode: Show actual team color
    const displayTeam = revealMode === 'color' && role.isSpy
      ? (team === 'RED' ? 'BLUE' : team === 'BLUE' ? 'RED' : team)
      : team;

    const bgColor = displayTeam === 'RED' ? '#dc2626' : displayTeam === 'BLUE' ? '#2563eb' : '#6b7280';
    const textColor = '#ffffff';

    const getTeamName = (teamColor: string) => {
      if (teamColor === 'RED') return '레드 팀';
      if (teamColor === 'BLUE') return '블루 팀';
      return '그레이 팀';
    };

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
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: bgColor,
            border: 'none',
            borderRadius: '8px',
            fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          ← 돌아가기
        </button>

        {/* Toggle mode button */}
        <button
          onClick={() => setRevealMode(prev => prev === 'color' ? 'full' : 'color')}
          style={{
            position: 'absolute',
            top: 'clamp(0.5rem, 2vw, 1rem)',
            right: 'clamp(0.5rem, 2vw, 1rem)',
            padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: bgColor,
            border: 'none',
            borderRadius: '8px',
            fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          {revealMode === 'color' ? '🃏 전체 공개' : '🎨 색상만'}
        </button>

        {/* Center content */}
        <div style={{ textAlign: 'center', maxWidth: '90%', width: '100%' }}>
          {revealMode === 'color' ? (
            /* Color sharing mode: Team color only */
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
                {getTeamName(displayTeam)}
              </h1>
            </div>
          ) : (
            /* Full reveal mode: Complete role card */
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: 'clamp(1.5rem, 5vw, 3rem)',
                borderRadius: '24px',
                border: `4px solid rgba(255, 255, 255, 0.8)`,
                color: '#1f2937',
                maxWidth: '800px',
              }}
            >
              {/* Role icon */}
              {role.icon && (
                <div style={{ fontSize: 'clamp(2.5rem, 10vw, 4rem)', marginBottom: '1rem' }}>
                  {role.icon}
                </div>
              )}

              {/* Role name */}
              <h1
                style={{
                  fontSize: 'clamp(2rem, 8vw, 3rem)',
                  fontWeight: 'bold',
                  margin: '0 0 1rem 0',
                  color: bgColor,
                }}
              >
                {role.nameKo || role.name}
              </h1>

              {/* Team badge */}
              <div
                style={{
                  display: 'inline-block',
                  padding: 'clamp(0.4rem, 2vw, 0.5rem) clamp(1rem, 3vw, 1.5rem)',
                  borderRadius: '12px',
                  backgroundColor: bgColor,
                  color: textColor,
                  fontSize: 'clamp(1rem, 3vw, 1.5rem)',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                }}
              >
                {getTeamName(team)}
              </div>

              {/* Role type badges */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {role.isLeader && (
                  <span
                    style={{
                      fontSize: 'clamp(0.75rem, 2vw, 1rem)',
                      padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(251, 191, 36, 0.3)',
                      color: '#92400e',
                      fontWeight: 600,
                      border: '2px solid #fbbf24',
                    }}
                  >
                    👑 리더
                  </span>
                )}
                {role.isSpy && (
                  <span
                    style={{
                      fontSize: 'clamp(0.75rem, 2vw, 1rem)',
                      padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(167, 139, 250, 0.3)',
                      color: '#5b21b6',
                      fontWeight: 600,
                      border: '2px solid #a78bfa',
                    }}
                  >
                    🕵️ 스파이
                  </span>
                )}
                {team === 'GREY' && (
                  <span
                    style={{
                      fontSize: 'clamp(0.75rem, 2vw, 1rem)',
                      padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(107, 114, 128, 0.3)',
                      color: '#1f2937',
                      fontWeight: 600,
                      border: '2px solid #6b7280',
                    }}
                  >
                    ⚡ 독립
                  </span>
                )}
              </div>

              {/* Role description */}
              <p
                style={{
                  fontSize: 'clamp(0.95rem, 2.5vw, 1.25rem)',
                  lineHeight: 1.8,
                  margin: 0,
                  color: '#4b5563',
                  maxWidth: '600px',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              >
                {role.descriptionKo || role.description}
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
            zIndex: 500,
          }}
        >
          <p style={{ margin: 0 }}>
            {revealMode === 'color'
              ? '진영 정보 교환: 다른 플레이어에게 이 화면을 보여주세요'
              : '역할 카드 교환: 다른 플레이어에게 이 화면을 보여주세요'}
          </p>
        </div>
      </div>
    );
  }

  // Render vote view (handles both REMOVAL and ELECTION in single view)
  if (view === 'vote') {
    if (!activeVoteSession || !currentPlayer || !currentRoom) {
      // No active vote, redirect back to game
      setSearchParams({ view: 'game' });
      return null;
    }

    const playersInRoom = currentRoom === 'RED_ROOM' ? redRoomPlayers : blueRoomPlayers;

    return (
      <VotePage
        voteSession={activeVoteSession}
        voteResult={voteResult}
        hasVoted={hasVoted}
        players={playersInRoom}
        currentPlayer={currentPlayer}
        onVote={handleVote}
        onClose={() => setSearchParams({ view: 'game' })}
      />
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
    const myLeader = currentRoom === 'RED_ROOM' ? redLeader : blueLeader;
    const isLeader = currentPlayer?.id === myLeader?.id;

    return (
      <Layout>
        {/* Round Timer - sticky at top */}
        {currentRound > 0 && (
          <RoundTimer round={currentRound} timeRemaining={timeRemaining} totalTime={totalRoundTime} />
        )}

        {/* Exchange Animation Overlay */}
        <ExchangeAnimation
          isActive={showExchangeAnimation}
          exchanges={exchangeRecords}
          onComplete={handleExchangeAnimationComplete}
        />

        {/* Leader Transfer Modal */}
        {currentPlayer && (
          <LeaderTransferModal
            isOpen={showTransferModal}
            currentLeader={currentPlayer}
            roomPlayers={playersInMyRoom}
            onTransfer={handleTransferLeadership}
            onCancel={() => setShowTransferModal(false)}
            canTransfer={canTransferLeadership}
            blockReason={
              !canTransferLeadership
                ? '인질 선택 중이거나 투표 진행 중에는 리더십을 이전할 수 없습니다'
                : undefined
            }
          />
        )}

        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: 'clamp(0.5rem, 3vw, 2rem)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ marginBottom: 'clamp(1rem, 3vw, 2rem)' }}>
            <h1
              style={{
                margin: 0,
                color: 'var(--text-primary)',
                fontSize: 'clamp(1.5rem, 5vw, 2rem)',
              }}
            >
              게임 진행 중
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
              }}
            >
              방 코드: <strong>{roomCode}</strong>
              {currentRound > 0 && <> · 라운드 {currentRound}/3</>}
            </p>
          </div>

          <div
            className="game-container"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: 'clamp(1rem, 3vw, 2rem)',
              marginBottom: 'clamp(1rem, 3vw, 2rem)',
            }}
          >
            <div>
              <RoleCard role={role} team={team} currentRoom={currentRoom} />

              <button
                onClick={() => setSearchParams({ view: 'reveal' })}
                style={{
                  marginTop: 'clamp(0.75rem, 2vw, 1rem)',
                  width: '100%',
                  padding: 'clamp(0.75rem, 2.5vw, 1rem)',
                  backgroundColor: team === 'RED' ? '#dc2626' : team === 'BLUE' ? '#2563eb' : '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: 'clamp(1rem, 3vw, 1.1rem)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                📱 정보 교환 화면
              </button>
            </div>

            <div>
              <h2
                style={{
                  marginTop: 0,
                  fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
                }}
              >
                같은 방에 있는 플레이어
              </h2>
              <RoomPlayerList
                players={playersInMyRoom}
                roomColor={currentRoom}
                currentPlayerId={currentPlayer.id}
                leaderId={
                  currentRoom === 'RED_ROOM' ? redLeader?.id :
                  currentRoom === 'BLUE_ROOM' ? blueLeader?.id :
                  undefined
                }
              />

              {/* Vote initiation button - only shown to non-leaders */}
              {!isLeader &&
                currentRound > 0 &&
                playersInMyRoom.length >= 3 &&
                !activeVoteSession && (
                  <div style={{ marginTop: 'clamp(1rem, 3vw, 1.5rem)' }}>
                    <button
                      onClick={handleStartVote}
                      style={{
                        width: '100%',
                        padding: 'clamp(0.875rem, 2.5vw, 1rem)',
                        backgroundColor: '#8b5cf6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: 'clamp(0.95rem, 2.5vw, 1rem)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#7c3aed';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#8b5cf6';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      🗳️ 리더 교체 투표 시작
                    </button>
                  </div>
                )}
            </div>
          </div>

          {/* Round Timer Panel - only shown to leaders during active rounds */}
          {isLeader && currentRound > 0 && currentPlayer && (
            <div style={{ marginBottom: 'clamp(1rem, 3vw, 2rem)' }}>
              <RoundTimerPanel
                isLeader={isLeader}
                roundState={room.gameSession?.roundState || null}
                players={room.players}
                currentPlayerId={currentPlayer.id}
                currentRoom={currentRoom}
                onSelectHostages={handleSelectHostages}
                onLeaderReady={handleLeaderReady}
                onTransferLeadership={handleTransferLeadership}
              />
            </div>
          )}

          {/* Round History */}
          {historyEvents.length > 0 && (
            <div style={{ marginBottom: 'clamp(1rem, 3vw, 2rem)' }}>
              <RoundHistory events={historyEvents} />
            </div>
          )}

          <div
            style={{
              padding: 'clamp(0.75rem, 2.5vw, 1rem)',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                margin: 0,
                color: '#666',
                fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
              }}
            >
              오프라인에서 다른 플레이어들과 역할 공개, 정보 교환, 카드 교환을 진행하세요.
            </p>
          </div>

          {currentPlayer.isOwner && (
            <div
              style={{
                marginTop: 'clamp(1rem, 3vw, 2rem)',
                textAlign: 'center',
              }}
            >
              <button
                onClick={handleResetGame}
                disabled={isResetting}
                style={{
                  padding: 'clamp(0.65rem, 2vw, 0.75rem) clamp(1.25rem, 3vw, 1.5rem)',
                  backgroundColor: isResetting ? '#6c757d' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
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
      {/* Role list sidebar */}
      <RoleListSidebar
        roleConfigId={room?.roleConfigId}
        selectedRoles={room?.selectedRoles}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div style={{ maxWidth: '800px', margin: '0 auto', marginLeft: 'var(--sidebar-offset, auto)' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>대기실</h2>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>
            방 코드: {roomCode}
          </div>

          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
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
              title={room.players.length < 6 ? '최소 6명의 플레이어가 필요합니다' : '게임 시작'}
            >
              {isStarting ? '시작 중...' : `게임 시작 (${room.players.length}/${room.maxPlayers})`}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
