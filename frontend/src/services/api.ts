import type { RoleConfigsResponse, RoleConfig } from '../types/roleConfig';
import type { Player } from '../types/game.types';

// Use environment variable, or window.location.origin for production (same origin), or default to localhost
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.origin !== 'http://localhost:5173'
    ? window.location.origin
    : 'http://localhost:8080');

// T106: Korean error message mapping
const ERROR_MESSAGES: Record<string, string> = {
  // Room errors
  ROOM_NOT_FOUND: '방을 찾을 수 없습니다. 방 코드를 확인해주세요.',
  ROOM_FULL: '방이 가득 찼습니다. 다른 방에 참가해주세요.',
  GAME_ALREADY_STARTED: '이미 게임이 시작되었습니다.',
  INVALID_REQUEST: '잘못된 요청입니다.',
  INVALID_ROLE_CONFIG: '선택한 역할 설정을 찾을 수 없습니다.',

  // Player errors
  PLAYER_NOT_FOUND: '플레이어를 찾을 수 없습니다.',
  INVALID_NICKNAME: '닉네임은 2~20자 사이여야 합니다.',

  // Game errors
  INSUFFICIENT_PLAYERS: '게임을 시작하려면 최소 6명의 플레이어가 필요합니다.',
  GAME_NOT_STARTED: '게임이 시작되지 않았습니다.',

  // Role config errors
  FETCH_CONFIGS_FAILED: '역할 설정을 불러올 수 없습니다.',

  // Generic errors
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
};

export class APIError extends Error {
  code: string;
  details?: Record<string, unknown>;
  userMessage: string;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.details = details;
    // T106: Use Korean user-friendly message
    this.userMessage = ERROR_MESSAGES[code] || message || ERROR_MESSAGES['UNKNOWN_ERROR'];
  }
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new APIError(error.code, error.message, error.details);
  }

  return response.json();
}

export const api = {
  get: <T>(url: string) => fetchJSON<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: unknown) =>
    fetchJSON<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(url: string, body?: unknown) =>
    fetchJSON<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(url: string) => fetchJSON<T>(url, { method: 'DELETE' }),
};

// T052: Implement createRoom API function
export interface CreateRoomRequest {
  maxPlayers: number;
  isPublic?: boolean;
  roleConfigId?: string;
}

export interface CreateRoomResponse {
  code: string;
  status: string;
  players: Player[];
  maxPlayers: number;
  isPublic?: boolean;
  roleConfigId?: string;
  selectedRoles?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export async function createRoom(
  maxPlayers: number,
  isPublic: boolean = true,
  roleConfigId: string = 'standard',
  selectedRoles?: Record<string, number>
): Promise<CreateRoomResponse> {
  return api.post<CreateRoomResponse>('/api/v1/rooms', {
    maxPlayers,
    isPublic,
    roleConfigId,
    selectedRoles,
  });
}

// T053: Implement getRoom API function
export interface GetRoomResponse {
  code: string;
  status: string;
  players: Player[];
  maxPlayers: number;
  isPublic?: boolean;
  roleConfigId?: string;
  selectedRoles?: Record<string, number>;
  gameSession?: {
    id: string;
    roomCode: string;
    startedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export async function getRoom(roomCode: string): Promise<GetRoomResponse> {
  return api.get<GetRoomResponse>(`/api/v1/rooms/${roomCode}`);
}

// T054: Implement joinRoom API function
export interface JoinRoomResponse {
  id: string;
  nickname: string;
  isAnonymous: boolean;
  roomCode: string;
  isOwner: boolean;
  connectedAt: string;
}

export async function joinRoom(roomCode: string): Promise<JoinRoomResponse> {
  return api.post<JoinRoomResponse>(`/api/v1/rooms/${roomCode}/players`);
}

// T055: Implement updateNickname API function
export interface UpdateNicknameRequest {
  nickname: string;
}

export async function updateNickname(
  roomCode: string,
  playerId: string,
  nickname: string
): Promise<JoinRoomResponse> {
  return api.patch<JoinRoomResponse>(`/api/v1/rooms/${roomCode}/players/${playerId}/nickname`, {
    nickname,
  });
}

// Leave room API function
export async function leaveRoom(roomCode: string, playerId: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/api/v1/rooms/${roomCode}/players/${playerId}`);
}

// T080: Implement startGame API function
export interface StartGameResponse extends CreateRoomResponse {
  gameSession: {
    id: string;
    roomCode: string;
    startedAt: string;
  };
}

export async function startGame(roomCode: string): Promise<StartGameResponse> {
  return api.post<StartGameResponse>(`/api/v1/rooms/${roomCode}/game/start`);
}

// T094: Implement resetGame API function
export interface ResetGameResponse extends CreateRoomResponse {
  gameSession: null;
}

export async function resetGame(roomCode: string): Promise<ResetGameResponse> {
  return api.post<ResetGameResponse>(`/api/v1/rooms/${roomCode}/game/reset`);
}

// Room List API functions
export interface RoomListItem {
  code: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
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

export async function listRooms(
  status?: 'WAITING' | 'IN_PROGRESS',
  limit: number = 50,
  offset: number = 0
): Promise<RoomListResponse> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const queryString = params.toString();

  // Backend returns full Room objects with players array
  interface BackendRoomListResponse {
    rooms: Array<{
      code: string;
      status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
      players: Player[];
      maxPlayers: number;
      isPublic: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    limit: number;
    offset: number;
  }

  const response = await api.get<BackendRoomListResponse>(
    `/api/v1/rooms${queryString ? `?${queryString}` : ''}`
  );

  // Transform to RoomListItem format
  return {
    rooms: response.rooms.map((room) => ({
      code: room.code,
      status: room.status,
      currentPlayers: room.players.length,
      maxPlayers: room.maxPlayers,
      isPublic: room.isPublic,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      hostNickname: room.players.find((p) => p.isOwner)?.nickname,
    })),
    total: response.total,
    limit: response.limit,
    offset: response.offset,
  };
}

export interface UpdateRoomVisibilityRequest {
  isPublic: boolean;
}

export interface UpdateRoomVisibilityResponse {
  code: string;
  isPublic: boolean;
  message: string;
}

export async function updateRoomVisibility(
  roomCode: string,
  isPublic: boolean
): Promise<UpdateRoomVisibilityResponse> {
  return api.patch<UpdateRoomVisibilityResponse>(`/api/v1/rooms/${roomCode}/visibility`, {
    isPublic,
  });
}

// Get available role configurations
export async function getRoleConfigs(): Promise<RoleConfigsResponse> {
  return api.get<RoleConfigsResponse>('/api/v1/role-configs');
}

// Get specific role configuration by ID
export async function getRoleConfig(configId: string): Promise<RoleConfig> {
  return api.get<RoleConfig>(`/api/v1/role-configs/${configId}`);
}
