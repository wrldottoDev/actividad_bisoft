import type { RoomPlayer } from '../types';
import { formatTime } from '../utils/format';

interface ScorePanelProps {
  currentPlayer: RoomPlayer;
  ranking: RoomPlayer[];
  elapsedSeconds: number;
  attemptsRemaining: number;
  completedPlayers: number;
  totalPlayers: number;
}

export function ScorePanel({
  currentPlayer,
  ranking,
  elapsedSeconds,
  attemptsRemaining,
  completedPlayers,
  totalPlayers,
}: ScorePanelProps) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <div className="stat-card">
          <span className="stat-label">Progreso</span>
          <strong className="stat-value">
            {completedPlayers}/{totalPlayers}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Cronómetro</span>
          <strong className="stat-value">{formatTime(elapsedSeconds)}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Intentos restantes</span>
          <strong className="stat-value">{attemptsRemaining}</strong>
        </div>
      </div>

      <div className="mt-4 rounded-[28px] border border-slate-200/70 bg-slate-50/90 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
          Puntaje actual
        </p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              {currentPlayer.score} pts
            </p>
            <p className="text-sm text-slate-500">{currentPlayer.name}</p>
          </div>
          <span className="soft-pill">Desempate por menor tiempo</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Ranking acumulado</p>
            <h2 className="section-title">Tabla en vivo</h2>
          </div>
        </div>

        <div className="space-y-2">
          {ranking.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center justify-between gap-3 rounded-[22px] border px-4 py-3 transition-colors ${
                player.id === currentPlayer.id
                  ? 'border-slate-900 bg-slate-950 text-white'
                  : 'border-slate-200/70 bg-white text-slate-900'
              }`}
            >
              <div className="min-w-0">
                <p
                  className={`text-xs uppercase tracking-[0.18em] ${
                    player.id === currentPlayer.id ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  #{index + 1}
                </p>
                <p className="truncate text-sm font-semibold sm:text-base">
                  {player.name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-['IBM_Plex_Mono'] text-sm font-medium">
                  {player.score} pts
                </p>
                <p
                  className={`text-xs ${
                    player.id === currentPlayer.id ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {formatTime(player.totalTime)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
