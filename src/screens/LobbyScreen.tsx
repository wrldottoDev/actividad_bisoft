import type { ConnectionStatus, RoomSnapshot } from '../types';
import { formatConnectionStatus } from '../utils/game';

interface LobbyScreenProps {
  room: RoomSnapshot;
  connectionStatus: ConnectionStatus;
  isBusy: boolean;
  onStartGame: () => void;
  onCopyCode: () => void;
}

export function LobbyScreen({
  room,
  connectionStatus,
  isBusy,
  onStartGame,
  onCopyCode,
}: LobbyScreenProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-6">
        <div className="panel p-6 sm:p-8">
          <p className="eyebrow">Sala</p>
          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
            Lobby activo
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Comparte este código con los demás jugadores. Cuando el admin inicie,
            todos recibirán la misma misión al mismo tiempo.
          </p>

          <div className="mt-6 rounded-[30px] border border-slate-200/70 bg-slate-950 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
              Código de sala
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <strong className="font-['IBM_Plex_Mono'] text-4xl tracking-[0.18em]">
                {room.roomCode}
              </strong>
              <button className="btn-secondary" onClick={onCopyCode}>
                Copiar código
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="stat-card">
              <span className="stat-label">Jugadores</span>
              <strong className="stat-value">{room.playerCount}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Conexión</span>
              <strong className="stat-value">{formatConnectionStatus(connectionStatus)}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Rol</span>
              <strong className="stat-value">{room.isAdmin ? 'Admin' : 'Jugador'}</strong>
            </div>
          </div>

          <div className="mt-6">
            {room.isAdmin ? (
              <button
                className="btn-primary"
                onClick={onStartGame}
                disabled={!room.canStart || isBusy}
              >
                {isBusy ? 'Iniciando...' : 'Iniciar partida'}
              </button>
            ) : (
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                Esperando a que el admin inicie la partida.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="panel p-6 sm:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Participantes</p>
            <h2 className="section-title">Jugadores conectados</h2>
          </div>
          <span className="soft-pill">{room.playerCount} en sala</span>
        </div>

        <div className="mt-5 space-y-3">
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
                    Slot #{index + 1}
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-[-0.03em]">
                    {player.name}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {player.isAdmin ? (
                    <span className="soft-pill bg-slate-900 text-white ring-0">Admin</span>
                  ) : null}
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      player.isOnline
                        ? 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20'
                        : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                    }`}
                  >
                    {player.isOnline ? 'En línea' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
