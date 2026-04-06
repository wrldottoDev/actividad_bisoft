import type { BlockType, ConnectionStatus } from '../types';

export const BLOCK_TONE_CLASSES: Record<
  BlockType,
  { badge: string; surface: string }
> = {
  GET: {
    badge: 'bg-sky-500 text-white',
    surface: 'border-sky-200 bg-sky-500/10 text-sky-950',
  },
  POST: {
    badge: 'bg-emerald-500 text-white',
    surface: 'border-emerald-200 bg-emerald-500/10 text-emerald-950',
  },
  PUT: {
    badge: 'bg-amber-400 text-amber-950',
    surface: 'border-amber-200 bg-amber-400/18 text-amber-950',
  },
  DELETE: {
    badge: 'bg-rose-500 text-white',
    surface: 'border-rose-200 bg-rose-500/12 text-rose-950',
  },
  JWT: {
    badge: 'bg-violet-500 text-white',
    surface: 'border-violet-200 bg-violet-500/12 text-violet-950',
  },
  HEADERS: {
    badge: 'bg-slate-300 text-slate-900',
    surface: 'border-slate-200 bg-slate-100 text-slate-900',
  },
  BODY: {
    badge: 'bg-slate-500 text-white',
    surface: 'border-slate-200 bg-slate-100 text-slate-900',
  },
};

export function formatConnectionStatus(status: ConnectionStatus) {
  if (status === 'live') {
    return 'En línea';
  }

  if (status === 'connecting') {
    return 'Reconectando';
  }

  return 'Desconectado';
}

export function normalizeRoomCode(code: string) {
  return code.trim().toUpperCase();
}
