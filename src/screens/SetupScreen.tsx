import { useState } from 'react';
import { PlayerList } from '../components/PlayerList';

const MAX_PLAYERS = 8;

interface SetupScreenProps {
  onBack: () => void;
  onStartGame: (players: string[]) => void;
}

export function SetupScreen({ onBack, onStartGame }: SetupScreenProps) {
  const [draftName, setDraftName] = useState('');
  const [players, setPlayers] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

  const handleAddPlayer = () => {
    const normalized = draftName.trim();

    if (!normalized) {
      setNotice('Escribe un nombre antes de agregar.');
      return;
    }

    if (players.some((player) => player.toLowerCase() === normalized.toLowerCase())) {
      setNotice('Ese nombre ya existe en la partida.');
      return;
    }

    if (players.length >= MAX_PLAYERS) {
      setNotice(`Máximo ${MAX_PLAYERS} jugadores.`);
      return;
    }

    setPlayers((current) => [...current, normalized]);
    setDraftName('');
    setNotice('');
  };

  const handleRemovePlayer = (playerToRemove: string) => {
    setPlayers((current) => current.filter((player) => player !== playerToRemove));
    setNotice('');
  };

  const handleSubmit = () => {
    if (players.length < 2) {
      setNotice('Necesitas al menos 2 jugadores.');
      return;
    }

    onStartGame(players);
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="panel p-6 sm:p-8">
        <p className="eyebrow">Configuración</p>
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
          Prepara la partida
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Agrega los nombres, reparte una misión aleatoria por jugador y deja que
          el ranking decida al ganador.
        </p>

        <div className="mt-6 rounded-[28px] border border-slate-200/70 bg-slate-50/90 p-4">
          <p className="text-sm font-semibold text-slate-900">Reglas rápidas</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-[22px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Acierto
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">+100 puntos</p>
            </div>
            <div className="rounded-[22px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Velocidad
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Bonus extra</p>
            </div>
            <div className="rounded-[22px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Fallo
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Penalización</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button className="btn-secondary" onClick={onBack}>
            Volver
          </button>
          <button className="btn-primary" onClick={handleSubmit}>
            Iniciar partida
          </button>
        </div>
      </div>

      <div className="panel p-6 sm:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Jugadores</p>
            <h2 className="section-title">Lista de participantes</h2>
          </div>
          <span className="soft-pill">
            {players.length}/{MAX_PLAYERS}
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddPlayer();
              }
            }}
            placeholder="Nombre del jugador"
            className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-5 py-3 text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
          />
          <button className="btn-secondary" onClick={handleAddPlayer}>
            Añadir jugador
          </button>
        </div>

        {notice ? (
          <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {notice}
          </div>
        ) : null}

        <div className="mt-5">
          <PlayerList players={players} onRemovePlayer={handleRemovePlayer} />
        </div>
      </div>
    </section>
  );
}
