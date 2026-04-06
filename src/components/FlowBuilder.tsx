import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BlockDefinition } from '../types';
import { ApiBlock } from './ApiBlock';

interface FlowBuilderProps {
  flowIds: string[];
  blocksById: Record<string, BlockDefinition>;
  onRemoveBlock: (blockId: string) => void;
}

interface SortableFlowBlockProps {
  block: BlockDefinition;
  index: number;
  onRemoveBlock: (blockId: string) => void;
}

function SortableFlowBlock({
  block,
  index,
  onRemoveBlock,
}: SortableFlowBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: block.id,
      data: {
        source: 'flow',
        blockId: block.id,
      },
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="touch-none cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <ApiBlock
        block={block}
        index={index}
        isDragging={isDragging}
        trailing={
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRemoveBlock(block.id);
            }}
          >
            Quitar
          </button>
        }
      />
    </div>
  );
}

export function FlowBuilder({
  flowIds,
  blocksById,
  onRemoveBlock,
}: FlowBuilderProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'flow-zone',
    data: {
      source: 'flow-zone',
    },
  });

  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Flujo</p>
          <h2 className="section-title">Zona de armado</h2>
        </div>
        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">
          Reordena libremente
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[220px] rounded-[30px] border border-dashed p-4 transition-all duration-200 sm:min-h-[260px] sm:p-5 ${
          isOver
            ? 'border-slate-400 bg-slate-50 shadow-inner'
            : 'border-slate-300 bg-slate-50/70'
        }`}
      >
        {flowIds.length === 0 ? (
          <div className="flex h-full min-h-[180px] items-center justify-center text-center text-sm text-slate-500">
            Suelta aquí los bloques para construir el request flow.
          </div>
        ) : (
          <SortableContext items={flowIds} strategy={rectSortingStrategy}>
            <div className="grid gap-3 md:grid-cols-2">
              {flowIds.map((blockId, index) => (
                <SortableFlowBlock
                  key={blockId}
                  block={blocksById[blockId]}
                  index={index}
                  onRemoveBlock={onRemoveBlock}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </section>
  );
}
