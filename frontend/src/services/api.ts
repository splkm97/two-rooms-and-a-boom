const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export class APIError extends Error {
  code: string;
  details?: Record<string, any>;

  constructor(code: string, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.details = details;
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
  post: <T>(url: string, body?: any) =>
    fetchJSON<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(url: string, body?: any) =>
    fetchJSON<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(url: string) => fetchJSON<T>(url, { method: 'DELETE' }),
};

// T052: Implement createRoom API function
export interface CreateRoomRequest {
  maxPlayers: number;
}

export interface CreateRoomResponse {
  code: string;
  status: string;
  players: any[];
  maxPlayers: number;
  createdAt: string;
  updatedAt: string;
}

export async function createRoom(maxPlayers: number): Promise<CreateRoomResponse> {
  return api.post<CreateRoomResponse>('/api/v1/rooms', { maxPlayers });
}

// T053: Implement getRoom API function
export async function getRoom(roomCode: string): Promise<CreateRoomResponse> {
  return api.get<CreateRoomResponse>(`/api/v1/rooms/${roomCode}`);
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
  return api.patch<JoinRoomResponse>(
    `/api/v1/rooms/${roomCode}/players/${playerId}/nickname`,
    { nickname }
  );
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
