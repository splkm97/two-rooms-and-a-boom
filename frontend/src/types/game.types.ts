// Team and Room colors
export type TeamColor = 'RED' | 'BLUE' | 'GREY';
export type RoomColor = 'RED_ROOM' | 'BLUE_ROOM';
export type RoomStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';

// Role definition
export interface Role {
  id: string;
  name: string;
  nameKo?: string;
  description: string;
  descriptionKo?: string;
  team: TeamColor;
  icon?: string;
  isSpy: boolean;
  isLeader: boolean;
}

// Player definition
export interface Player {
  id: string;
  nickname: string;
  isAnonymous: boolean;
  roomCode: string;
  isOwner: boolean;
  role?: Role;
  team?: TeamColor;
  currentRoom?: RoomColor;
  connectedAt: string;
}

// Game session definition
export interface GameSession {
  id: string;
  roomCode: string;
  redTeam: Player[];
  blueTeam: Player[];
  redRoomPlayers: Player[];
  blueRoomPlayers: Player[];
  startedAt: string;
}

// Room definition
export interface Room {
  code: string;
  status: RoomStatus;
  players: Player[];
  maxPlayers: number;
  roleConfigId?: string;
  selectedRoles?: Record<string, number>;
  gameSession?: GameSession;
  createdAt: string;
  updatedAt: string;
}

// Round state and status
export type RoundStatus = 'SETUP' | 'ACTIVE' | 'SELECTING' | 'EXCHANGING' | 'COMPLETE';

export interface RoundState {
  gameSessionId: string;
  roundNumber: number;        // 1, 2, 3
  duration: number;           // 180, 120, 60
  timeRemaining: number;      // Seconds
  status: RoundStatus;
  redLeaderId: string;
  blueLeaderId: string;
  hostageCount: number;
  redHostages: string[];
  blueHostages: string[];
  startedAt: string;
  endedAt?: string;
}

export interface LeaderInfo {
  id: string;
  nickname: string;
}

export interface ExchangeRecord {
  roundNumber: number;
  playerId: string;
  playerName: string;
  fromRoom: RoomColor;
  toRoom: RoomColor;
  timestamp: string;
}

// Vote types
export type VoteChoice = 'YES' | 'NO';
export type VoteType = 'REMOVAL' | 'ELECTION';
export type VoteResult = 'PASSED' | 'FAILED' | 'TIMEOUT';
export type VoteSessionStatus = 'ACTIVE' | 'COMPLETED' | 'TIMEOUT';
export type LeadershipChangeReason = 'VOLUNTARY_TRANSFER' | 'DISCONNECTION' | 'VOTE_REMOVAL';

export interface VoteSession {
  voteID: string;
  gameSessionId: string;
  roomColor: RoomColor;
  voteType?: VoteType;
  targetLeaderId: string;
  targetLeaderName: string;
  initiatorId: string;
  initiatorName: string;
  candidates?: string[];
  startedAt: string;
  expiresAt: string;
  timeoutSeconds: number;
  totalVoters: number;
  votedCount: number;
  status: VoteSessionStatus;
}

export interface VoteResultPayload {
  voteID: string;
  result: VoteResult;
  yesVotes: number;
  noVotes: number;
  totalVoters: number;
  newLeaderId?: string;
  newLeaderName?: string;
}

// WebSocket message types
export type WSMessageType =
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'PLAYER_DISCONNECTED'
  | 'NICKNAME_CHANGED'
  | 'OWNER_CHANGED'
  | 'GAME_STARTED'
  | 'ROLE_ASSIGNED'
  | 'GAME_RESET'
  // Round management events
  | 'ROUND_STARTED'
  | 'TIMER_TICK'
  | 'ROUND_ENDED'
  // Leader management events
  | 'LEADER_ASSIGNED'
  | 'LEADER_TRANSFERRED'
  | 'LEADERSHIP_CHANGED'
  // Vote events
  | 'VOTE_REMOVE_LEADER_STARTED'
  | 'VOTE_SESSION_STARTED'
  | 'VOTE_CAST'
  | 'VOTE_PROGRESS'
  | 'VOTE_COMPLETED'
  // Hostage exchange events
  | 'HOSTAGES_SELECTED'
  | 'LEADER_ANNOUNCED_HOSTAGES'
  | 'EXCHANGE_READY'
  | 'EXCHANGE_COMPLETE';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
}

// WebSocket payload types
export interface PlayerJoinedPayload {
  player: Player;
}

export interface PlayerLeftPayload {
  playerId: string;
}

export interface PlayerDisconnectedPayload {
  playerId: string;
}

export interface NicknameChangedPayload {
  playerId: string;
  newNickname: string;
}

export interface OwnerChangedPayload {
  newOwner: Player;
}

export interface GameStartedPayload {
  gameSession: GameSession;
}

export interface RoleAssignedPayload {
  role: Role;
  team: TeamColor;
  currentRoom: RoomColor;
}

export interface GameResetPayload {
  room: Room;
}

// Round-related payloads
export interface RoundStartedPayload {
  roundNumber: number;
  duration: number;
  timeRemaining: number;
  redLeader: LeaderInfo;
  blueLeader: LeaderInfo;
  hostageCount: number;
}

export interface TimerTickPayload {
  roundNumber: number;
  timeRemaining: number;
}

export interface RoundEndedPayload {
  roundNumber: number;
  finalRound: boolean;
  nextPhase: string;
}

// Leader-related payloads
export interface LeaderAssignedPayload {
  roomColor: RoomColor;
  leader: LeaderInfo;
}

export interface LeaderTransferredPayload {
  roomColor: RoomColor;
  newLeaderId: string;
}

export interface LeadershipChangedPayload {
  roomColor: RoomColor;
  oldLeader: LeaderInfo | null;
  newLeader: LeaderInfo | null;
  reason: LeadershipChangeReason;
  timestamp: string;
}

// Vote-related payloads
export interface VoteRemoveLeaderStartedPayload {
  roomColor: RoomColor;
  targetLeaderId: string;
}

export interface VoteSessionStartedPayload {
  voteId: string; // Note: backend sends camelCase 'voteId', not 'voteID'
  roomColor: RoomColor;
  targetLeader: LeaderInfo;
  initiator: LeaderInfo;
  candidates?: string[]; // For election votes - array of candidate player IDs
  totalVoters: number;
  timeoutSeconds: number;
  startedAt: string;
}

export interface VoteCastPayload {
  voteID: string;
  vote: VoteChoice;
}

export interface VoteProgressPayload {
  voteID: string;
  votedCount: number;
  totalVoters: number;
  timeRemaining: number;
}

// Exchange-related payloads
export interface HostagesSelectedPayload {
  roomColor: RoomColor;
  hostageIDs: string[];
}

export interface LeaderAnnouncedHostagesPayload {
  roomColor: RoomColor;
  hostages: LeaderInfo[];
  waitingForOtherLeader: boolean;
}

export interface ExchangeReadyPayload {
  redHostages: string[];
  blueHostages: string[];
  countdown: number;
}

export interface ExchangeCompletePayload {
  roundNumber: number;
  exchanges: ExchangeRecord[];
  nextRound?: number;
}

// API request/response types
export interface CreateRoomRequest {
  maxPlayers: number;
  isPublic?: boolean;
}

export interface CreateRoomResponse {
  room: Room;
}

export interface UpdateNicknameRequest {
  nickname: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Room List types
export interface RoomListItem {
  code: string;
  status: RoomStatus;
  currentPlayers: number;
  maxPlayers: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  hostNickname?: string;
}

export interface RoomListResponse {
  rooms: RoomListItem[];
  total: number;
  limit: number;
  offset: number;
}
