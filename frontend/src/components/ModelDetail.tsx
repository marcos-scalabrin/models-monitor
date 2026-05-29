import { useEffect, useState } from "react";
import type { ProfileInfo, ScoredModel } from "../types";
import { fmtContext, fmtDate, fmtPct, fmtScore, fmtUSD } from "../lib";
import { TierBadge } from "./TierBadge";

function Row({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2 text-sm">
      <span className="text-muted" title={hint}>
        {label}
      </span>
      <span className="text-right font-medium text-text">{value}</span>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-lg font-semibold ${accent ? "text-accent-soft" : "text-text"}`}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wider text-muted">{children}</h3>
  );
}

function ParamChip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-xs ${
        on
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-border bg-surface-2 text-muted line-through"
      }`}
    >
      {label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => setCopied(true));
      }}
      title="Copiar id do modelo"
      className="group inline-flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 font-mono text-xs text-muted transition hover:border-accent/40 hover:bg-surface-2 hover:text-text"
    >
      <span className="truncate">{value}</span>
      <span className={`shrink-0 text-[10px] ${copied ? "text-emerald-300" : "text-muted opacity-0 group-hover:opacity-100"}`}>
        {copied ? "✓ copiado" : "copiar"}
      </span>
    </button>
  );
}

export function ModelDetail({
  model,
  profiles,
  currentProfile,
  onClose,
  onCompare,
  inCompare,
}: {
  model: ScoredModel | null;
  profiles: ProfileInfo[];
  currentProfile: string;
  onClose: () => void;
  onCompare: (id: string) => void;
  inCompare: boolean;
}) {
  const [showFullDesc, setShowFullDesc] = useState(false);
  useEffect(() => setShowFullDesc(false), [model?.id]);

  if (!model) return null;
  const e = model.evaluations;
  const p = model.pricing;
  const desc = model.description ?? "";
  const longDesc = desc.length > 320;
  const shownDesc = !longDesc || showFullDesc ? desc : desc.slice(0, 300).trimEnd() + "…";

  const supports = (k: string) => model.supported_parameters.includes(k);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <TierBadge tier={model.tier} withLabel />
            </div>
            <h2 className="mb-1 truncate text-lg font-semibold text-text">{model.name}</h2>
            <CopyButton value={model.id} />
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-2.5 py-1 text-muted transition hover:bg-surface-2 hover:text-text"
              title="Fechar"
            >
              ✕
            </button>
            <button
              onClick={() => onCompare(model.id)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                inCompare
                  ? "border-accent/60 bg-accent/15 text-accent-soft"
                  : "border-border text-muted hover:border-accent/60 hover:text-text"
              }`}
              title="Adicionar à comparação"
            >
              {inCompare ? "✓ comparar" : "+ comparar"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="mb-5 grid grid-cols-3 gap-2">
            <Stat label="Value ratio" value={String(model.value_ratio ?? "—")} accent />
            <Stat label="Bench (perfil)" value={fmtScore(model.benchmark_score)} />
            <Stat label="Custo/1M" value={fmtUSD(model.cost_for_profile)} />
          </div>

          {desc && (
            <>
              <SectionTitle>Descrição</SectionTitle>
              <p className="mb-4 whitespace-pre-line text-xs leading-relaxed text-muted">
                {shownDesc}
                {longDesc && (
                  <button
                    onClick={() => setShowFullDesc((v) => !v)}
                    className="ml-1 text-accent-soft hover:underline"
                  >
                    {showFullDesc ? "ver menos" : "ver mais"}
                  </button>
                )}
              </p>
            </>
          )}

          <SectionTitle>Datas</SectionTitle>
          <div className="mb-5">
            <Row
              label="Release"
              value={fmtDate(model.release_date)}
              hint="Data oficial de lançamento (Artificial Analysis)"
            />
            <Row
              label="Adicionado ao OpenRouter"
              value={fmtDate(model.added_at)}
              hint="Quando o OpenRouter listou o modelo"
            />
            <Row label="Knowledge cutoff" value={fmtDate(model.knowledge_cutoff)} />
          </div>

          <SectionTitle>Capacidades & Modalidades</SectionTitle>
          <div className="mb-3">
            <Row label="Context window" value={fmtContext(model.context_length)} />
            <Row label="Max output" value={fmtContext(model.max_output_tokens)} />
            <Row label="Modalidade" value={model.modality || "—"} />
            <Row label="Tokenizer" value={model.tokenizer || "—"} />
          </div>
          {(model.input_modalities.length > 0 || model.output_modalities.length > 0) && (
            <div className="mb-5 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="mb-1 text-muted">Input</div>
                <div className="flex flex-wrap gap-1">
                  {model.input_modalities.map((m) => (
                    <span key={m} className="rounded-md bg-surface-2 px-2 py-0.5 text-text">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-muted">Output</div>
                <div className="flex flex-wrap gap-1">
                  {model.output_modalities.map((m) => (
                    <span key={m} className="rounded-md bg-surface-2 px-2 py-0.5 text-text">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <SectionTitle>Índices (Artificial Analysis)</SectionTitle>
          <div className="mb-5">
            <Row label="Intelligence Index" value={fmtScore(e.intelligence)} />
            <Row label="Coding Index" value={fmtScore(e.coding)} />
            <Row label="Math Index" value={fmtScore(e.math)} />
          </div>

          <SectionTitle>Reasoning & Conhecimento</SectionTitle>
          <div className="mb-5">
            <Row label="GPQA Diamond" value={fmtPct(e.gpqa)} hint="Ciência nível graduate" />
            <Row label="Humanity's Last Exam" value={fmtPct(e.hle)} hint="Raciocínio extremo" />
            <Row label="SciCode" value={fmtPct(e.scicode)} hint="Ciência + código" />
            <Row label="MMLU-Pro" value={fmtPct(e.mmlu_pro)} />
            <Row label="MATH-500" value={fmtPct(e.math_500)} />
            <Row label="AIME" value={fmtPct(e.aime)} />
            <Row label="AIME 2025" value={fmtPct(e.aime_25)} />
            <Row label="LCR (long-context)" value={fmtPct(e.lcr)} />
            <Row label="LiveCodeBench" value={fmtPct(e.livecodebench)} />
          </div>

          <SectionTitle>Orquestração & Tool Use</SectionTitle>
          <div className="mb-3">
            <Row label="IFBench" value={fmtPct(e.ifbench)} hint="Seguir instruções complexas" />
            <Row label="τ-bench (Tau2)" value={fmtPct(e.tau2)} hint="Agente com tool-use" />
            <Row label="Terminal-Bench Hard" value={fmtPct(e.terminalbench_hard)} hint="Agente em terminal" />
          </div>
          <div className="mb-5 flex flex-wrap gap-1.5">
            <ParamChip label="tools" on={supports("tools")} />
            <ParamChip label="tool_choice" on={supports("tool_choice")} />
            <ParamChip label="structured_outputs" on={supports("structured_outputs")} />
            <ParamChip label="response_format" on={supports("response_format")} />
            <ParamChip label="reasoning" on={supports("reasoning")} />
          </div>

          <SectionTitle>Pricing</SectionTitle>
          <div className="mb-5">
            <Row label="Input" value={`${fmtUSD(p.input_1m)}/1M`} />
            <Row label="Output" value={`${fmtUSD(p.output_1m)}/1M`} />
            <Row
              label={`Cache read${p.cache_estimated ? " (est.)" : ""}`}
              value={`${fmtUSD(p.cache_read_1m)}/1M`}
            />
            <Row
              label={`Cache write${p.cache_estimated ? " (est.)" : ""}`}
              value={`${fmtUSD(p.cache_write_1m)}/1M`}
            />
            <Row label="Fonte de preço" value={p.source} />
          </div>

          <SectionTitle>Custo por perfil de agente</SectionTitle>
          <p className="mb-2 text-[11px] leading-relaxed text-muted">
            Mesmo pricing, funções de custo diferentes. Cada perfil pesa input/output/cache
            do jeito que reflete seu padrão de uso.
          </p>
          <div className="mb-5 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface-2/40 text-muted">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Perfil</th>
                  <th className="px-3 py-1.5 text-left font-medium">Padrão de custo</th>
                  <th className="px-3 py-1.5 text-right font-medium">$/1M</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((pf) => {
                  const v = model.costs_by_profile?.[pf.key];
                  const active = pf.key === currentProfile;
                  return (
                    <tr
                      key={pf.key}
                      className={`border-t border-border/40 ${active ? "bg-accent/10" : ""}`}
                    >
                      <td className="px-3 py-1.5 text-text">
                        {active && <span className="mr-1 text-accent-soft">●</span>}
                        {pf.label}
                      </td>
                      <td className="px-3 py-1.5 text-muted">{pf.cost_pattern}</td>
                      <td
                        className={`px-3 py-1.5 text-right tabular-nums ${active ? "font-semibold text-accent-soft" : "text-text"}`}
                      >
                        {fmtUSD(v)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <SectionTitle>Performance</SectionTitle>
          <div className="mb-5">
            <Row
              label="Throughput"
              value={`${model.performance.output_tokens_per_second?.toFixed(0) ?? "—"} t/s`}
            />
            <Row
              label="TTFT"
              value={
                model.performance.time_to_first_token_s != null
                  ? `${model.performance.time_to_first_token_s.toFixed(1)}s`
                  : "—"
              }
              hint="Time to first token (inclui thinking)"
            />
            <Row
              label="TTFA (após thinking)"
              value={
                model.performance.time_to_first_answer_s != null
                  ? `${model.performance.time_to_first_answer_s.toFixed(1)}s`
                  : "—"
              }
              hint="Time to first answer — para reasoning models"
            />
            <Row label="Fontes" value={model.sources.join(" + ") || "—"} />
          </div>

          {model.supported_parameters.length > 0 && (
            <>
              <SectionTitle>Parâmetros suportados (OpenRouter)</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {model.supported_parameters.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
