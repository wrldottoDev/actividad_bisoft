import type { PlayerSession, RoomSnapshot, SessionResponse } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
  /\/$/,
  '',
);
const WS_BASE = (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.replace(
  /\/$/,
  '',
);

function buildHttpUrl(path: string) {
  if (!API_BASE) {
    return path;
  }

  return `${API_BASE}${path}`;
}

function parseErrorPayload(payload: unknown) {
  if (
    payload &&
    typeof payload === 'object' &&
    'detail' in payload &&
    typeof payload.detail === 'string'
  ) {
    return payload.detail;
  }

  return 'No se pudo completar la solicitud.';
}

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildHttpUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new Error(parseErrorPayload(payload));
  }

  return payload as T;
}

export function buildRoomWebSocketUrl(session: PlayerSession) {
  if (WS_BASE) {
    const url = new URL(
      `/ws/rooms/${session.roomCode}?playerId=${session.playerId}&token=${session.token}`,
      WS_BASE,
    );
    return url.toString();
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/rooms/${session.roomCode}?playerId=${session.playerId}&token=${session.token}`;
}

export function createRoom(name: string) {
  return request<SessionResponse>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function joinRoom(roomCode: string, name: string) {
  return request<SessionResponse>('/api/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, name }),
  });
}

export async function fetchRoom(session: PlayerSession) {
  const response = await request<{ room: RoomSnapshot }>(
    `/api/rooms/${session.roomCode}?playerId=${session.playerId}&token=${session.token}`,
  );
  return response.room;
}

async function authedPost(path: string, session: PlayerSession, extra?: object) {
  const response = await request<{ room: RoomSnapshot }>(path, {
    method: 'POST',
    body: JSON.stringify({
      playerId: session.playerId,
      token: session.token,
      ...(extra ?? {}),
    }),
  });

  return response.room;
}

export function startRoom(session: PlayerSession) {
  return authedPost(`/api/rooms/${session.roomCode}/start`, session);
}

export function validateTurn(session: PlayerSession, flowIds: string[]) {
  return authedPost(`/api/rooms/${session.roomCode}/validate`, session, { flowIds });
}

export function restartRoom(session: PlayerSession) {
  return authedPost(`/api/rooms/${session.roomCode}/restart`, session);
}
