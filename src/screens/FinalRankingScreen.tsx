import type { RoomPlayer } from '../types';
import { formatTime } from '../utils/format';

interface FinalRankingScreenProps {
  players: RoomPlayer[];
  winnerId: string | null;
  isAdmin: boolean;
  onRestart: () => void;
}

export function FinalRankingScreen({
  players,
  winnerId,
  isAdmin,
  onRestart,
}: FinalRankingScreenProps) {
  const winner = players.find((player) => player.id === winnerId) ?? players[0];

  return (
    <section className="space-y-6">
      <div className="panel p-6 sm:p-8">
        <p className="eyebrow">Ranking final</p>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl">
              {winner ? `${winner.name} gana la sala` : 'Partida finalizada'}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              El ranking final se ordena por mayor puntuación y, si hay empate, por
              menor tiempo total.
            </p>
          </div>

          {isAdmin ? (
            <button className="btn-primary" onClick={onRestart}>
              Nueva partida
            </button>
          ) : (
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Esperando reinicio del admin
            </div>
          )}
        </div>
      </div>

      {winner ? (
        <div className="panel p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[30px] border border-slate-200/70 bg-slate-950 p-6 text-white shadow-[var(--shadow-card)]">
              <p className="eyebrow text-slate-300">Ganador</p>
              <h3 className="text-3xl font-semibold tracking-[-0.05em]">
                {winner.name}
              </h3>
              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-[22px] bg-white/8 px-4 py-3 ring-1 ring-white/10">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                    Puntos
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{winner.score}</p>
                </div>
                <div className="rounded-[22px] bg-white/8 px-4 py-3 ring-1 ring-white/10">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                    Tiempo
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatTime(winner.totalTime)}
                  </p>
                </div>
                <div className="rounded-[22px] bg-white/8 px-4 py-3 ring-1 ring-white/10">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                    Misiones
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {winner.solvedMissions}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`rounded-[28px] border px-5 py-4 shadow-sm ${
                    player.id === winnerId
                      ? 'border-slate-900 bg-slate-950 text-white'
                      : 'border-slate-200/70 bg-white text-slate-900'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p
                        className={`text-xs uppercase tracking-[0.18em] ${
                          player.id === winnerId ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        Posición #{index + 1}
                      </p>
                      <p className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                        {player.name}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <p
                          className={`text-xs uppercase tracking-[0.18em] ${
                            player.id === winnerId ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          Score
                        </p>
                        <p className="mt-1 font-['IBM_Plex_Mono'] text-sm font-medium">
                          {player.score} pts
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-xs uppercase tracking-[0.18em] ${
                            player.id === winnerId ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          Tiempo
                        </p>
                        <p className="mt-1 font-['IBM_Plex_Mono'] text-sm font-medium">
                          {formatTime(player.totalTime)}
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-xs uppercase tracking-[0.18em] ${
                            player.id === winnerId ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          Resultado
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {player.solvedMissions > 0 ? 'Resuelta' : 'No resuelta'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
