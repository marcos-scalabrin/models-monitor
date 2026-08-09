import type { MetaInfo, ProfileInfo } from "../types";
import { timeAgo } from "../lib";

export function Header({
  profiles,
  profile,
  onProfile,
  alpha,
  onAlpha,
  meta,
  onRefresh,
  refreshing,
}: {
  profiles: ProfileInfo[];
  profile: string;
  onProfile: (key: string) => void;
  alpha: number;
  onAlpha: (a: number) => void;
  meta: MetaInfo | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const mode = meta?.source_mode ?? "fixtures";
  const modeStyle = {
    live: "bg-emerald-500/15 text-emerald-300",
    mixed: "bg-sky-500/15 text-sky-300",
    fixtures: "bg-amber-500/15 text-amber-300",
  }[mode];
  const dotStyle = {
    live: "bg-emerald-400",
    mixed: "bg-sky-400",
    fixtures: "bg-amber-400",
  }[mode];
  const sourceSummary = meta
    ? `OpenRouter: ${meta.sources.openrouter.mode}; Artificial Analysis: ${meta.sources.artificial_analysis.mode}`
    : "";

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border bg-surface/40 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-sky-500 text-lg font-bold text-white shadow-lg shadow-accent/30">
          H
        </div>
        <div>
          <h1 className="text-base font-semibold leading-tight text-text">Hermes Model Router</h1>
          <p className="text-xs text-muted">Mapa custo × performance para seleção de modelos</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted">Perfil</label>
        <select
          value={profile}
          onChange={(e) => onProfile(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-text outline-none focus:border-accent/60"
        >
          {profiles.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs font-medium uppercase tracking-wide text-muted">
          Sensib. custo (α)
        </label>
        <input
          type="range"
          min={0}
          max={1.5}
          step={0.1}
          value={alpha}
          onChange={(e) => onAlpha(Number(e.target.value))}
          className="w-32"
        />
        <span className="w-8 text-sm tabular-nums text-accent-soft">{alpha.toFixed(1)}</span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        {meta && (
          <div className="hidden items-center gap-4 text-xs text-muted sm:flex">
            <span
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${modeStyle}`}
              title={sourceSummary}
              aria-label={`Fontes: ${sourceSummary}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dotStyle}`} />
              {mode}
            </span>
            <span>
              <b className="text-text">{meta.matched_models}</b>/{meta.total_models} matched
            </span>
            <span title="Artificial Analysis disponível">
              AA {meta.aa_available ? "✓" : "✗"}
            </span>
            <span>{timeAgo(meta.last_updated)}</span>
          </div>
        )}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-text transition hover:border-accent/60 disabled:opacity-50"
        >
          {refreshing ? "Atualizando…" : "↻ Atualizar"}
        </button>
      </div>
    </header>
  );
}
