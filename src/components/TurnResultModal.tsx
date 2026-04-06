import type { RoomPlayer, TurnResult } from '../types';
import { formatTime } from '../utils/format';

interface TurnResultModalProps {
  outcome: TurnResult;
  ranking: RoomPlayer[];
  canContinue: boolean;
  onContinue: () => void;
}

export function TurnResultModal({
  outcome,
  ranking,
  canContinue,
  onContinue,
}: TurnResultModalProps) {
  return (
    <div className="panel p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Resultado del turno</p>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {outcome.isCorrect ? 'Flujo correcto' : 'Turno fallido'}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{outcome.feedback}</p>
        </div>

        <span
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            outcome.isCorrect
              ? 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20'
              : 'bg-rose-500/12 text-rose-700 ring-1 ring-rose-500/20'
          }`}
        >
          {outcome.playerName}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <span className="stat-label">Puntos</span>
          <strong className="stat-value">
            {outcome.pointsEarned >= 0 ? '+' : ''}
            {outcome.pointsEarned}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tiempo</span>
          <strong className="stat-value">{formatTime(outcome.timeUsed)}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Acumulado</span>
          <strong className="stat-value">{outcome.accumulatedScore}</strong>
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-slate-200/70 bg-slate-50/90 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">Ranking en vivo</p>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Tie-break por tiempo
          </span>
        </div>

        <div className="space-y-2">
          {ranking.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center justify-between gap-3 rounded-[22px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  #{index + 1}
                </p>
                <p className="font-semibold text-slate-900">{player.name}</p>
              </div>
              <div className="text-right font-['IBM_Plex_Mono'] text-sm text-slate-700">
                <p>{player.score} pts</p>
                <p className="text-xs text-slate-500">{formatTime(player.totalTime)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        {canContinue ? (
          <button className="btn-primary" onClick={onContinue}>
            Siguiente turno
          </button>
        ) : (
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Esperando al admin para continuar
          </div>
        )}
      </div>
    </div>
  );
}
