import type { ConnectionStatus, RoomSnapshot } from '../types';
import { formatTime } from '../utils/format';
import { formatConnectionStatus } from '../utils/game';

interface WaitingScreenProps {
  room: RoomSnapshot;
  connectionStatus: ConnectionStatus;
}

export function WaitingScreen({ room, connectionStatus }: WaitingScreenProps) {
  const myResult = room.myResult;

  return (
    <section className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
      <div className="space-y-6">
        <div className="panel p-6 sm:p-8">
          <p className="eyebrow">Ronda en curso</p>
          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
            {myResult ? 'Ya terminaste tu misión' : 'Esperando sincronización'}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {room.round
              ? `Van ${room.round.completedPlayers} de ${room.round.totalPlayers} jugadores resueltos.`
              : 'La sala sigue sincronizando el progreso.'}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="stat-card">
              <span className="stat-label">Tu score</span>
              <strong className="stat-value">{room.me.score}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Estado</span>
              <strong className="stat-value">{formatConnectionStatus(connectionStatus)}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Restantes</span>
              <strong className="stat-value">{room.round?.remainingPlayers ?? 0}</strong>
            </div>
          </div>
        </div>

        {myResult ? (
          <div className="panel p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Tu resultado</p>
                <h3 className="section-title">
                  {myResult.isCorrect ? 'Flujo correcto' : 'Misión cerrada'}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{myResult.feedback}</p>
              </div>
              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  myResult.isCorrect
                    ? 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20'
                    : 'bg-rose-500/12 text-rose-700 ring-1 ring-rose-500/20'
                }`}
              >
                {myResult.isCorrect ? 'Correcto' : 'Incorrecto'}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="stat-card">
                <span className="stat-label">Puntos</span>
                <strong className="stat-value">
                  {myResult.pointsEarned >= 0 ? '+' : ''}
                  {myResult.pointsEarned}
                </strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Tiempo</span>
                <strong className="stat-value">{formatTime(myResult.timeUsed)}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Intentos</span>
                <strong className="stat-value">{myResult.attemptsUsed}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="panel p-6 sm:p-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Ranking acumulado</p>
            <h2 className="section-title">Tabla en vivo</h2>
          </div>
          <span className="soft-pill">Tie-break por tiempo</span>
        </div>

        <div className="space-y-3">
          {room.players.map((player, index) => (
            <div
              key={player.id}
              className={`rounded-[26px] border px-4 py-4 shadow-sm ${
                player.id === room.me.id
                  ? 'border-slate-900 bg-slate-950 text-white'
                  : 'border-slate-200/70 bg-white text-slate-900'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p
                    className={`text-xs uppercase tracking-[0.18em] ${
                      player.id === room.me.id ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    #{index + 1}
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-[-0.03em]">
                    {player.name}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p
                      className={`text-xs uppercase tracking-[0.18em] ${
                        player.id === room.me.id ? 'text-slate-300' : 'text-slate-400'
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
                        player.id === room.me.id ? 'text-slate-300' : 'text-slate-400'
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
                        player.id === room.me.id ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      Progreso
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {player.isFinished ? 'Completado' : 'Jugando'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
