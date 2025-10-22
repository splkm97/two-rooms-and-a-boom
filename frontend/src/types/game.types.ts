// Team and Room colors
export type TeamColor = 'RED' | 'BLUE';
export type RoomColor = 'RED_ROOM' | 'BLUE_ROOM';
export type RoomStatus = 'WAITING' | 'IN_PROGRESS';

// Role definition
export interface Role {
  id: string;
  name: string;
  description: string;
  team: TeamColor;
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
  gameSession?: GameSession;
  createdAt: string;
  updatedAt: string;
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
  | 'GAME_RESET';

export interface WSMessage<T = any> {
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

// API request/response types
export interface CreateRoomRequest {
  maxPlayers: number;
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
  details?: Record<string, any>;
}
