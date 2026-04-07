import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useEffect, useRef, useState } from 'react';
import { ApiBlock } from '../components/ApiBlock';
import { BlockPalette } from '../components/BlockPalette';
import { FlowBuilder } from '../components/FlowBuilder';
import { MissionCard } from '../components/MissionCard';
import { ScorePanel } from '../components/ScorePanel';
import { useTurnTimer } from '../hooks/useTurnTimer';
import type { BlockDefinition, MissionPayload, RoomPlayer } from '../types';

interface TurnScreenProps {
  player: RoomPlayer;
  mission: MissionPayload;
  ranking: RoomPlayer[];
  roundNumber: number;
  totalRounds: number;
  totalPlayers: number;
  completedPlayers: number;
  startedAt: string | null;
  attemptsRemaining: number;
  feedback: string;
  hintUsed: boolean;
  hintText: string | null;
  timeLimitSeconds: number;
  isSubmitting: boolean;
  onValidateFlow: (flowIds: string[]) => void;
  onUseHint: () => void;
}

function getFlowInsertionIndex(flowIds: string[], overId: string | null) {
  if (!overId || overId === 'flow-zone') {
    return flowIds.length;
  }

  const overIndex = flowIds.indexOf(overId);
  return overIndex === -1 ? flowIds.length : overIndex;
}

export function TurnScreen({
  player,
  mission,
  ranking,
  roundNumber,
  totalRounds,
  totalPlayers,
  completedPlayers,
  startedAt,
  attemptsRemaining,
  feedback,
  hintUsed,
  hintText,
  timeLimitSeconds,
  isSubmitting,
  onValidateFlow,
  onUseHint,
}: TurnScreenProps) {
  const [flowIds, setFlowIds] = useState<string[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const autoSubmittedRef = useRef(false);
  const { elapsedSeconds, remainingSeconds, isExpired } = useTurnTimer(
    startedAt,
    timeLimitSeconds,
  );

  useEffect(() => {
    autoSubmittedRef.current = false;
  }, [startedAt, mission.id]);

  useEffect(() => {
    if (!isExpired || isSubmitting || autoSubmittedRef.current) {
      return;
    }

    autoSubmittedRef.current = true;
    onValidateFlow(flowIds);
  }, [flowIds, isExpired, isSubmitting, onValidateFlow]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const blocksById = mission.availableBlocks.reduce<Record<string, BlockDefinition>>(
    (accumulator, block) => {
      accumulator[block.id] = block;
      return accumulator;
    },
    {},
  );

  const activeBlock = activeBlockId ? blocksById[activeBlockId] : undefined;

  const handleAddBlock = (blockId: string) => {
    if (flowIds.includes(blockId)) {
      return;
    }

    setFlowIds((current) => [...current, blockId]);
  };

  const handleRemoveBlock = (blockId: string) => {
    setFlowIds((current) => current.filter((id) => id !== blockId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const blockId = event.active.data.current?.blockId as string | undefined;
    setActiveBlockId(blockId ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current as
      | { source?: 'palette' | 'flow'; blockId?: string }
      | undefined;

    setActiveBlockId(null);

    if (!activeData?.blockId || !event.over) {
      return;
    }

    const overId = String(event.over.id);

    if (activeData.source === 'palette') {
      if (flowIds.includes(activeData.blockId)) {
        return;
      }

      const nextIndex = getFlowInsertionIndex(flowIds, overId);
      const nextFlow = [...flowIds];
      nextFlow.splice(nextIndex, 0, activeData.blockId);
      setFlowIds(nextFlow);
      return;
    }

    if (activeData.source === 'flow') {
      const oldIndex = flowIds.indexOf(activeData.blockId);

      if (oldIndex === -1) {
        return;
      }

      if (overId === 'flow-zone') {
        const nextFlow = [...flowIds];
        const [moved] = nextFlow.splice(oldIndex, 1);
        nextFlow.push(moved);
        setFlowIds(nextFlow);
        return;
      }

      const newIndex = flowIds.indexOf(overId);

      if (newIndex === -1 || newIndex === oldIndex) {
        return;
      }

      const nextFlow = [...flowIds];
      const [moved] = nextFlow.splice(oldIndex, 1);
      nextFlow.splice(newIndex, 0, moved);
      setFlowIds(nextFlow);
    }
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6">
        <div className="panel p-5 sm:p-6">
          <p className="eyebrow">Ronda activa</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {player.name}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Todos juegan al mismo tiempo. Tienes un minuto por reto y la partida avanza sola por 3 rondas.
              </p>
            </div>
            <span className="soft-pill">
              Ronda {roundNumber}/{totalRounds}
            </span>
          </div>
        </div>

        <MissionCard
          mission={mission}
          hintUsed={hintUsed}
          hintText={hintText}
          isBusy={isSubmitting || isExpired}
          onUseHint={onUseHint}
        />

        <ScorePanel
          currentPlayer={player}
          ranking={ranking}
          elapsedSeconds={elapsedSeconds}
          remainingSeconds={remainingSeconds}
          attemptsRemaining={attemptsRemaining}
          completedPlayers={completedPlayers}
          totalPlayers={totalPlayers}
          roundNumber={roundNumber}
          totalRounds={totalRounds}
        />
      </div>

      <div className="space-y-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveBlockId(null)}
        >
          <BlockPalette
            blocks={mission.availableBlocks}
            selectedBlockIds={flowIds}
            onAddBlock={handleAddBlock}
          />

          <FlowBuilder
            flowIds={flowIds}
            blocksById={blocksById}
            onRemoveBlock={handleRemoveBlock}
          />

          <DragOverlay>
            {activeBlock ? <ApiBlock block={activeBlock} isDragging /> : null}
          </DragOverlay>
        </DndContext>

        {feedback ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            {feedback}
          </div>
        ) : isExpired ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            Tiempo agotado. Enviando tu resultado.
          </div>
        ) : (
          <div className="rounded-[24px] border border-slate-200/70 bg-white px-4 py-4 text-sm text-slate-500">
            Arrastra los bloques correctos. Puedes reordenarlos o quitarlos antes de validar.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            className="btn-secondary"
            onClick={() => setFlowIds([])}
            disabled={flowIds.length === 0 || isSubmitting || isExpired}
          >
            Limpiar flujo
          </button>
          <button
            className="btn-primary"
            onClick={() => onValidateFlow(flowIds)}
            disabled={isSubmitting || isExpired}
          >
            {isSubmitting ? 'Validando...' : 'Validar flujo'}
          </button>
        </div>
      </div>
    </section>
  );
}
