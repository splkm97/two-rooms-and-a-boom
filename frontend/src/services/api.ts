const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export class APIError extends Error {
  constructor(public code: string, message: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'APIError';
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
