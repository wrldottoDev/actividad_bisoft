interface PlayerListProps {
  players: string[];
  onRemovePlayer: (name: string) => void;
}

export function PlayerList({ players, onRemovePlayer }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
        Agrega al menos 2 jugadores para iniciar la partida.
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {players.map((player, index) => (
        <li
          key={player}
          className="flex items-center justify-between rounded-[24px] border border-slate-200/70 bg-white px-4 py-3 shadow-sm"
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Jugador {index + 1}
            </p>
            <p className="truncate text-base font-semibold text-slate-950">{player}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            onClick={() => onRemovePlayer(player)}
          >
            Quitar
          </button>
        </li>
      ))}
    </ul>
  );
}
