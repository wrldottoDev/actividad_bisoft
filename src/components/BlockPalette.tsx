import { useDraggable } from '@dnd-kit/core';
import type { BlockDefinition } from '../types';
import { ApiBlock } from './ApiBlock';

interface BlockPaletteProps {
  blocks: BlockDefinition[];
  selectedBlockIds: string[];
  onAddBlock: (blockId: string) => void;
}

interface PaletteBlockProps {
  block: BlockDefinition;
  disabled: boolean;
  onAddBlock: (blockId: string) => void;
}

function PaletteBlock({ block, disabled, onAddBlock }: PaletteBlockProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${block.id}`,
    data: {
      source: 'palette',
      blockId: block.id,
    },
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={`touch-none ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}`}
      {...attributes}
      {...listeners}
    >
      <ApiBlock
        block={block}
        isMuted={disabled}
        isDragging={isDragging}
        trailing={
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              disabled
                ? 'bg-slate-200 text-slate-500'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onAddBlock(block.id);
            }}
            disabled={disabled}
          >
            {disabled ? 'En flujo' : 'Agregar'}
          </button>
        }
      />
    </div>
  );
}

export function BlockPalette({
  blocks,
  selectedBlockIds,
  onAddBlock,
}: BlockPaletteProps) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Bloques</p>
          <h2 className="section-title">Paleta disponible</h2>
        </div>
        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">
          Arrastra o toca
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {blocks.map((block) => (
          <PaletteBlock
            key={block.id}
            block={block}
            disabled={selectedBlockIds.includes(block.id)}
            onAddBlock={onAddBlock}
          />
        ))}
      </div>
    </section>
  );
}
