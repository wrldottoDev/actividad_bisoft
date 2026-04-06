import type { MissionPayload } from '../types';

interface MissionCardProps {
  mission: MissionPayload;
}

export function MissionCard({ mission }: MissionCardProps) {
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
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Objetivo</p>
        <p className="mt-2 font-['IBM_Plex_Mono'] text-sm font-medium text-slate-800 sm:text-base">
          {mission.objective}
        </p>
      </div>
    </section>
  );
}
