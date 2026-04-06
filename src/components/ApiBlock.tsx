import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';
import { BLOCK_TONE_CLASSES } from '../utils/game';

interface ApiBlockProps {
  block: BlockDefinition;
  index?: number;
  isMuted?: boolean;
  isDragging?: boolean;
  trailing?: ReactNode;
}

export function ApiBlock({
  block,
  index,
  isMuted = false,
  isDragging = false,
  trailing,
}: ApiBlockProps) {
  const tone = BLOCK_TONE_CLASSES[block.type];

  return (
    <div
      className={`flex w-full items-center gap-3 rounded-[24px] border px-3 py-3 shadow-sm transition-all duration-200 ${
        tone.surface
      } ${isMuted ? 'opacity-45 grayscale-[0.2]' : ''} ${
        isDragging ? 'scale-[0.98] opacity-70 shadow-none' : 'hover:-translate-y-0.5'
      }`}
    >
      {typeof index === 'number' && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-sm font-semibold text-slate-700 shadow-sm">
          {index + 1}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 font-['IBM_Plex_Mono'] text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.badge}`}
          >
            {block.type}
          </span>
          <span className="truncate text-sm font-medium text-slate-700">
            Endpoint block
          </span>
        </div>
        <p className="mt-2 truncate text-sm font-semibold tracking-[-0.02em] text-slate-950 sm:text-base">
          {block.label}
        </p>
      </div>

      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
