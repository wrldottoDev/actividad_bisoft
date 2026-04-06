import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildRoomWebSocketUrl,
  createRoom,
  fetchRoom,
  joinRoom,
  restartRoom,
  startRoom,
  validateTurn,
} from '../lib/api';
import type {
  ConnectionStatus,
  PlayerSession,
  RoomSnapshot,
  SessionResponse,
} from '../types';

const STORAGE_KEY = 'endpoint-heist-session';

function readStoredSession() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PlayerSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function persistSession(session: PlayerSession | null) {
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function useRoomGame() {
  const [session, setSession] = useState<PlayerSession | null>(() => readStoredSession());
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('offline');
  const [reconnectTick, setReconnectTick] = useState(0);
  const retryTimeoutRef = useRef<number | null>(null);

  const saveSession = useCallback((nextSession: PlayerSession | null) => {
    persistSession(nextSession);
    setSession(nextSession);
  }, []);

  const applySessionPayload = useCallback((payload: SessionResponse) => {
    saveSession(payload.session);
    setRoom(payload.room);
    setError('');
  }, [saveSession]);

  const clearLocalSession = useCallback(() => {
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
    }

    saveSession(null);
    setRoom(null);
    setError('');
    setConnectionStatus('offline');
  }, [saveSession]);

  useEffect(() => {
    if (!session) {
      setRoom(null);
      setConnectionStatus('offline');
      return;
    }

    let cancelled = false;
    setPendingAction((current) => current ?? 'sync');

    fetchRoom(session)
      .then((nextRoom) => {
        if (cancelled) {
          return;
        }

        setRoom(nextRoom);
        setError('');
      })
      .catch((caughtError: unknown) => {
        if (cancelled) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'No se pudo recuperar la sala.';
        clearLocalSession();
        setError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setPendingAction((current) => (current === 'sync' ? null : current));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clearLocalSession, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let shouldReconnect = true;
    let heartbeatId: number | null = null;
    const socket = new WebSocket(buildRoomWebSocketUrl(session));

    setConnectionStatus('connecting');

    socket.onopen = () => {
      setConnectionStatus('live');
      heartbeatId = window.setInterval(() => {
        socket.send(JSON.stringify({ type: 'ping' }));
      }, 20000);
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as
        | { type: 'room.updated'; room: RoomSnapshot }
        | { type: 'pong' };

      if (payload.type === 'room.updated') {
        setRoom(payload.room);
      }
    };

    socket.onclose = () => {
      setConnectionStatus('connecting');
      if (heartbeatId) {
        window.clearInterval(heartbeatId);
      }

      if (!shouldReconnect) {
        setConnectionStatus('offline');
        return;
      }

      retryTimeoutRef.current = window.setTimeout(() => {
        setReconnectTick((current) => current + 1);
      }, 1500);
    };

    socket.onerror = () => {
      socket.close();
    };

    return () => {
      shouldReconnect = false;

      if (heartbeatId) {
        window.clearInterval(heartbeatId);
      }

      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }

      socket.close();
    };
  }, [reconnectTick, session]);

  const runAction = async <T,>(
    actionName: string,
    task: () => Promise<T>,
    onSuccess?: (value: T) => void,
  ) => {
    setPendingAction(actionName);
    setError('');

    try {
      const value = await task();
      onSuccess?.(value);
      return value;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo completar la acción.';
      setError(message);
      return null;
    } finally {
      setPendingAction(null);
    }
  };

  return {
    session,
    room,
    error,
    connectionStatus,
    isBusy: pendingAction !== null,
    pendingAction,
    clearLocalSession,
    clearError: () => setError(''),
    createRoom: (name: string) =>
      runAction('create-room', () => createRoom(name), (payload) =>
        applySessionPayload(payload),
      ),
    joinRoom: (roomCode: string, name: string) =>
      runAction('join-room', () => joinRoom(roomCode, name), (payload) =>
        applySessionPayload(payload),
      ),
    startGame: () =>
      session
        ? runAction('start-game', () => startRoom(session), (nextRoom) =>
            setRoom(nextRoom),
          )
        : Promise.resolve(null),
    validateFlow: (flowIds: string[]) =>
      session
        ? runAction('validate-flow', () => validateTurn(session, flowIds), (nextRoom) =>
            setRoom(nextRoom),
          )
        : Promise.resolve(null),
    restartMatch: () =>
      session
        ? runAction('restart-room', () => restartRoom(session), (nextRoom) =>
            setRoom(nextRoom),
          )
        : Promise.resolve(null),
  };
}
