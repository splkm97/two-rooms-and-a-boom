import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useWebSocket } from '../useWebSocket';
import type { WSMessage } from '../../types/game.types';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send() {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
    }
  }

  // Helper method for tests to simulate incoming messages
  simulateMessage(message: WSMessage) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(message) }));
    }
  }

  // Helper method for tests to simulate errors
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

describe('useWebSocket', () => {
  let mockWS: MockWebSocket;

  beforeEach(() => {
    // Clear previous instances
    MockWebSocket.instances = [];
    // @ts-expect-error - Replace global WebSocket with our mock
    global.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    vi.clearAllMocks();
    MockWebSocket.instances = [];
  });

  it('should connect to WebSocket on mount', async () => {
    const { result } = renderHook(() => useWebSocket('ABC123', 'player-1'));

    // Get the mock instance
    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0);
    });

    mockWS = MockWebSocket.instances[0];
    expect(mockWS.url).toContain('/ws/ABC123');
    expect(mockWS.url).toContain('playerId=player-1');

    // Wait for connection to open
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('should not connect if roomCode is empty', () => {
    renderHook(() => useWebSocket(''));

    expect(MockWebSocket.instances.length).toBe(0);
  });

  it('should receive and parse messages', async () => {
    const { result } = renderHook(() => useWebSocket('ABC123', 'player-1'));

    // Get the mock instance
    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0);
    });
    mockWS = MockWebSocket.instances[0];

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const testMessage: WSMessage = {
      type: 'PLAYER_JOINED',
      payload: { playerId: '123', nickname: 'Test Player' },
    };

    mockWS.simulateMessage(testMessage);

    await waitFor(() => {
      expect(result.current.lastMessage).toEqual(testMessage);
    });
  });

  it('should send messages when connected', async () => {
    const { result } = renderHook(() => useWebSocket('ABC123', 'player-1'));

    // Get the mock instance
    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0);
    });
    mockWS = MockWebSocket.instances[0];

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const sendSpy = vi.spyOn(mockWS, 'send');
    const testMessage: WSMessage = {
      type: 'NICKNAME_CHANGED',
      payload: { nickname: 'New Name' },
    };

    result.current.sendMessage(testMessage);

    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(testMessage));
  });

  it('should handle connection errors', async () => {
    const { result } = renderHook(() => useWebSocket('ABC123', 'player-1'));

    // Get the mock instance
    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0);
    });
    mockWS = MockWebSocket.instances[0];

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    mockWS.simulateError();

    await waitFor(() => {
      expect(result.current.connectionError).toBeTruthy();
    });
  });

  it('should close connection on unmount', async () => {
    const { result, unmount } = renderHook(() => useWebSocket('ABC123', 'player-1'));

    // Get the mock instance
    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0);
    });
    mockWS = MockWebSocket.instances[0];

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const closeSpy = vi.spyOn(mockWS, 'close');
    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('should handle manual reconnect', async () => {
    const { result } = renderHook(() => useWebSocket('ABC123', 'player-1'));

    // Get the mock instance
    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(0);
    });
    mockWS = MockWebSocket.instances[0];

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate connection error
    mockWS.simulateError();

    await waitFor(() => {
      expect(result.current.connectionError).toBeTruthy();
    });

    // Manual reconnect
    result.current.manualReconnect();

    // A new WebSocket instance should be created
    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(2);
    });
  });

  // Test removed: "should persist WebSocket connection during navigation"
  // With query parameter routing (/room/:roomCode?view=lobby|game), the component
  // stays mounted during view changes, so WebSocket naturally persists.
  // No need for complex shared connection logic or testing it.
});
