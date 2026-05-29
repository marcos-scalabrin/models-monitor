import type { Recommendation, ScoredModel } from "../types";
import { fmtUSD, fmtScore } from "../lib";
import { TierBadge } from "./TierBadge";

function ModelLine({
  model,
  role,
  onSelect,
}: {
  model: ScoredModel;
  role: string;
  onSelect: (m: ScoredModel) => void;
}) {
  return (
    <button
      onClick={() => onSelect(model)}
      className="group flex w-full items-center gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-left transition hover:border-accent/50 hover:bg-surface-2"
    >
      <TierBadge tier={model.tier} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-sm text-text">{model.id}</div>
        <div className="text-xs text-muted">{role}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold text-accent-soft">vr {model.value_ratio ?? "—"}</div>
        <div className="text-xs text-muted">
          {fmtScore(model.benchmark_score)} · {fmtUSD(model.cost_for_profile)}/1M
        </div>
      </div>
    </button>
  );
}

export function RecommendationPanel({
  rec,
  loading,
  onSelect,
}: {
  rec: Recommendation | null;
  loading: boolean;
  onSelect: (m: ScoredModel) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Recomendação
        </h2>
        <span className="text-xs text-muted">primary + fallbacks</span>
      </div>

      {loading && <div className="text-sm text-muted">Calculando…</div>}

      {!loading && rec?.primary && (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-accent-soft">
              Primary
            </div>
            <ModelLine model={rec.primary} role="Modelo primário" onSelect={onSelect} />
          </div>
          {rec.fallbacks.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                Fallbacks
              </div>
              <div className="space-y-2">
                {rec.fallbacks.map((m, i) => (
                  <ModelLine
                    key={m.id}
                    model={m}
                    role={`Fallback ${i + 1}`}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !rec?.primary && (
        <div className="text-sm text-muted">Sem modelos pontuáveis para este perfil.</div>
      )}
    </section>
  );
}
