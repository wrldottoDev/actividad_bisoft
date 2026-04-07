import type { MissionPayload } from '../types';

interface MissionCardProps {
  mission: MissionPayload;
  hintUsed: boolean;
  hintText: string | null;
  isBusy: boolean;
  onUseHint: () => void;
}

export function MissionCard({
  mission,
  hintUsed,
  hintText,
  isBusy,
  onUseHint,
}: MissionCardProps) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Misión activa</p>
          <h2 className="section-title">{mission.title}</h2>
        </div>
        <span className="soft-pill">{mission.difficulty}</span>
      </div>

      <p className="mt-3 text-sm text-slate-600 sm:text-base">{mission.description}</p>

      <div className="mt-5 rounded-[26px] border border-slate-200/70 bg-slate-50/90 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pista</p>
            <p className="mt-2 text-sm text-slate-600">
              Puedes revelar una pista por desafío. El total usado se mostrará al final.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onUseHint}
            disabled={hintUsed || isBusy}
          >
            {hintUsed ? 'Pista usada' : isBusy ? 'Cargando...' : 'Ver pista'}
          </button>
        </div>

        {hintText ? (
          <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            {hintText}
          </div>
        ) : null}
      </div>
    </section>
  );
}
