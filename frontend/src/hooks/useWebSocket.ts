import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage } from '../types/game.types';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000; // 3 seconds

/**
 * useWebSocket hook - simplified version for query parameter routing
 *
 * With query parameter routing (/room/:roomCode?view=lobby|game), the component
 * stays mounted during view changes, so the WebSocket connection naturally persists.
 * No need for complex shared connection logic.
 */
export function useWebSocket(roomCode: string, playerId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | undefined>(undefined);
  const intentionalClose = useRef(false);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    // Don't connect if roomCode is empty or invalid
    if (!roomCode || roomCode.length < 6) {
      console.log('WebSocket: Skipping connection (invalid room code)');
      return;
    }

    // Don't connect if playerId is not available yet
    if (!playerId) {
      console.log('WebSocket: Skipping connection (waiting for playerId)');
      return;
    }

    // Don't reconnect if max attempts reached
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionError('연결을 재시도할 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }

    try {
      const wsUrl = `${WS_BASE_URL}/ws/${roomCode}?playerId=${playerId}`;
      const websocket = new WebSocket(wsUrl);
      ws.current = websocket;

      websocket.onopen = () => {
        console.log(`WebSocket connected: ${roomCode}-${playerId}`);
        isConnectedRef.current = true;
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
      };

      websocket.onmessage = (event) => {
        try {
          // Handle multiple newline-separated JSON messages in one frame
          const data = event.data.toString().trim();
          const messages = data.split('\n').filter(line => line.trim());

          // Fallback: If we receive a message but onopen didn't fire, mark as connected
          if (!isConnectedRef.current && messages.length > 0) {
            console.log(`WebSocket connected (via message fallback): ${roomCode}-${playerId}`);
            isConnectedRef.current = true;
            setIsConnected(true);
            setConnectionError(null);
            setReconnectAttempts(0);
          }

          // Process each message
          for (const msgData of messages) {
            try {
              const message: WSMessage = JSON.parse(msgData);
              setLastMessage(message);
            } catch (parseError) {
              console.error('Failed to parse individual WebSocket message:', msgData, parseError);
            }
          }
        } catch (error) {
          console.error('Failed to process WebSocket message:', error);
          setConnectionError('메시지 처리 중 오류가 발생했습니다.');
        }
      };

      websocket.onclose = (event) => {
        console.log(`WebSocket disconnected: ${roomCode}-${playerId}`, event.code, event.reason);
        isConnectedRef.current = false;
        setIsConnected(false);

        // Don't reconnect if it was an intentional close
        if (intentionalClose.current) {
          return;
        }

        // Handle specific close codes
        if (event.code === 1008) { // Policy violation (e.g., room not found)
          setConnectionError('방을 찾을 수 없습니다.');
          return;
        }

        if (event.code === 1003) { // Unsupported data
          setConnectionError('서버와의 연결이 지원되지 않습니다.');
          return;
        }

        // Auto-reconnect after interval
        const newAttempts = reconnectAttempts + 1;
        setReconnectAttempts(newAttempts);
        setConnectionError(`연결이 끊어졌습니다. 재연결 시도 중... (${newAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }

        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, RECONNECT_INTERVAL);
      };

      websocket.onerror = (error) => {
        console.error(`WebSocket error: ${roomCode}-${playerId}`, error);
        setConnectionError('연결 오류가 발생했습니다.');
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setConnectionError('WebSocket 연결에 실패했습니다.');
    }
  }, [roomCode, playerId, reconnectAttempts]);

  useEffect(() => {
    intentionalClose.current = false;
    connect();

    return () => {
      intentionalClose.current = true;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WSMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket is not connected');
    }
  }, []);

  const manualReconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    setReconnectAttempts(0);
    setConnectionError(null);
    connect();
  }, [connect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connectionError,
    reconnectAttempts,
    manualReconnect,
  };
}
