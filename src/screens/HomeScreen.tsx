import { useState } from 'react';

interface HomeScreenProps {
  mode: 'join' | 'admin';
  busy: boolean;
  error: string;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomCode: string, name: string) => void;
}

export function HomeScreen({
  mode,
  busy,
  error,
  onCreateRoom,
  onJoinRoom,
}: HomeScreenProps) {
  const [adminName, setAdminName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const isAdminMode = mode === 'admin';

  return (
    <section className="flex min-h-[72vh] items-center">
      <div
        className={`w-full ${
          isAdminMode ? 'mx-auto max-w-2xl' : 'mx-auto max-w-xl'
        }`}
      >
        <div className="panel p-6 sm:p-8 lg:p-10">
          <p className="eyebrow">{isAdminMode ? 'Acceso admin' : 'Entrar a sala'}</p>
          <h2 className="text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl">
            {isAdminMode ? 'Crear nueva sala' : 'Únete con tu código'}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            {isAdminMode
              ? 'Solo desde /admin se puede crear una sala nueva.'
              : 'Ingresa tu nombre y el código compartido por el admin para entrar al lobby.'}
          </p>

          {error ? (
            <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {isAdminMode ? (
            <div className="mt-8 space-y-3">
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
          ) : (
            <div className="mt-8 space-y-3">
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
                className="btn-primary w-full"
                onClick={() => onJoinRoom(joinCode, joinName)}
                disabled={busy}
              >
                {busy ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
