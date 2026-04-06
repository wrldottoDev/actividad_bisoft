interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <section className="flex min-h-[72vh] items-center">
      <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel p-6 sm:p-8 lg:p-10">
          <p className="eyebrow">API flow puzzle</p>
          <h2 className="text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-6xl">
            Endpoint Heist
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Arrastra bloques, arma el flujo correcto y gana por precisión y
            rapidez. Todo ocurre por turnos en el mismo dispositivo.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className="btn-primary" onClick={onStart}>
              Empezar
            </button>
            <div className="panel-muted flex items-center px-5 py-3 text-sm text-slate-600">
              +100 por flujo correcto, bonus por rapidez y desempate por tiempo total.
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="panel p-5 sm:p-6">
            <p className="eyebrow">Cómo se juega</p>
            <div className="space-y-4">
              <div className="rounded-[26px] border border-slate-200/70 bg-slate-50/90 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  1. Configura los jugadores
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Cada persona ingresa su nombre y espera su turno.
                </p>
              </div>
              <div className="rounded-[26px] border border-slate-200/70 bg-slate-50/90 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  2. Resuelve la misión
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Ordena endpoints, JWT, headers y body dentro del flujo.
                </p>
              </div>
              <div className="rounded-[26px] border border-slate-200/70 bg-slate-50/90 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  3. Compite por el ranking
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Gana quien sume más puntos; si hay empate, manda el menor tiempo.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="stat-card">
              <span className="stat-label">Modo</span>
              <strong className="stat-value">Local</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Mecánica</span>
              <strong className="stat-value">DnD</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Estilo</span>
              <strong className="stat-value">Dashboard</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
