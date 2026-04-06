import { useState } from 'react';

interface HomeScreenProps {
  busy: boolean;
  error: string;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
}

export function HomeScreen({
  busy,
  error,
  onCreateRoom,
  onJoinRoom,
}: HomeScreenProps) {
  const [adminName, setAdminName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  return (
    <section className="flex min-h-[72vh] items-center">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="panel p-6 sm:p-8 lg:p-10">
          <p className="eyebrow">Realtime room mode</p>
          <h2 className="text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-6xl">
            Endpoint Heist
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Un admin crea la sala, comparte el código y cada jugador entra desde su
            propio dispositivo para competir al mismo tiempo.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="stat-card">
              <span className="stat-label">Backend</span>
              <strong className="stat-value">Python</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Sincronía</span>
              <strong className="stat-value">Live</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Acceso</span>
              <strong className="stat-value">Código</strong>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="grid gap-6">
          <div className="panel p-6 sm:p-8">
            <p className="eyebrow">Crear sala</p>
            <h3 className="section-title">Admin de partida</h3>
            <p className="mt-3 text-sm text-slate-600">
              Crea la sala, comparte el código y lanza la ronda para todos a la vez.
            </p>

            <div className="mt-5 space-y-3">
              <input
                type="text"
                value={adminName}
                onChange={(event) => setAdminName(event.target.value)}
                placeholder="Nombre del admin"
                className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
              />
              <button
                className="btn-primary w-full"
                onClick={() => onCreateRoom(adminName)}
                disabled={busy}
              >
                {busy ? 'Creando sala...' : 'Crear sala'}
              </button>
            </div>
          </div>

          <div className="panel p-6 sm:p-8">
            <p className="eyebrow">Entrar a sala</p>
            <h3 className="section-title">Jugador invitado</h3>
            <p className="mt-3 text-sm text-slate-600">
              Usa el código del admin y entra con tu nombre para aparecer en el lobby.
            </p>

            <div className="mt-5 space-y-3">
              <input
                type="text"
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
              />
              <input
                type="text"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="Código de sala"
                className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 font-['IBM_Plex_Mono'] uppercase tracking-[0.16em] text-slate-900 outline-none transition-colors placeholder:tracking-normal placeholder:text-slate-400 focus:border-slate-400"
              />
              <button
                className="btn-secondary w-full"
                onClick={() => onJoinRoom(joinCode, joinName)}
                disabled={busy}
              >
                {busy ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
