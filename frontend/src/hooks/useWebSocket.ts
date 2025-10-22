import { useEffect, useRef, useState, useCallback } from 'react';
import type { WSMessage } from '../types/game.types';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000; // 3 seconds

export function useWebSocket(roomCode: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | undefined>(undefined);
  const intentionalClose = useRef(false);

  const connect = useCallback(() => {
    if (!roomCode) return;

    // Don't reconnect if max attempts reached
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionError('연결을 재시도할 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }

    try {
      ws.current = new WebSocket(`${WS_BASE_URL}/ws/${roomCode}`);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0); // Reset reconnect counter on successful connection
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          setConnectionError('메시지 처리 중 오류가 발생했습니다.');
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);

        // Don't reconnect if it was an intentional close or server rejected connection
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
        setReconnectAttempts(prev => prev + 1);
        setConnectionError(`연결이 끊어졌습니다. 재연결 시도 중... (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, RECONNECT_INTERVAL);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('연결 오류가 발생했습니다.');
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setConnectionError('WebSocket 연결에 실패했습니다.');
    }
  }, [roomCode, reconnectAttempts]);

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
