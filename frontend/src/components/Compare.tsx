import { Fragment, useMemo } from "react";
import type { ProfileInfo, ScoredModel } from "../types";
import { fmtContext, fmtDate, fmtPct, fmtScore, fmtUSD } from "../lib";
import { TierBadge } from "./TierBadge";

type Dir = "max" | "min" | "bool" | "text";

interface Attr {
  label: string;
  hint?: string;
  get: (m: ScoredModel) => number | string | boolean | null;
  fmt?: (v: any) => string;
  dir: Dir;
  highlight?: boolean;  // accents the row label (e.g. for the current profile)
}

const SECTIONS_BEFORE_PROFILE_COSTS: { title: string; rows: Attr[] }[] = [
  {
    title: "Resumo",
    rows: [
      { label: "Tier", get: (m) => m.tier, dir: "text", fmt: (v) => v ?? "—" },
      { label: "Value ratio (perfil)", get: (m) => m.value_ratio, fmt: (v) => v ?? "—", dir: "max" },
      { label: "Benchmark (perfil)", get: (m) => m.benchmark_score, fmt: fmtScore, dir: "max" },
      { label: "Custo/1M (perfil)", get: (m) => m.cost_for_profile, fmt: fmtUSD, dir: "min" },
    ],
  },
  {
    title: "Índices",
    rows: [
      { label: "Intelligence", get: (m) => m.evaluations.intelligence, fmt: fmtScore, dir: "max" },
      { label: "Coding", get: (m) => m.evaluations.coding, fmt: fmtScore, dir: "max" },
      { label: "Math", get: (m) => m.evaluations.math, fmt: fmtScore, dir: "max" },
    ],
  },
  {
    title: "Reasoning",
    rows: [
      { label: "GPQA Diamond", get: (m) => m.evaluations.gpqa, fmt: fmtPct, dir: "max" },
      { label: "Humanity's Last Exam", get: (m) => m.evaluations.hle, fmt: fmtPct, dir: "max" },
      { label: "SciCode", get: (m) => m.evaluations.scicode, fmt: fmtPct, dir: "max" },
      { label: "MMLU-Pro", get: (m) => m.evaluations.mmlu_pro, fmt: fmtPct, dir: "max" },
      { label: "MATH-500", get: (m) => m.evaluations.math_500, fmt: fmtPct, dir: "max" },
      { label: "AIME", get: (m) => m.evaluations.aime, fmt: fmtPct, dir: "max" },
      { label: "AIME 2025", get: (m) => m.evaluations.aime_25, fmt: fmtPct, dir: "max" },
      { label: "LCR (long-context)", get: (m) => m.evaluations.lcr, fmt: fmtPct, dir: "max" },
      { label: "LiveCodeBench", get: (m) => m.evaluations.livecodebench, fmt: fmtPct, dir: "max" },
    ],
  },
  {
    title: "Orquestração & Tool Use",
    rows: [
      { label: "IFBench", get: (m) => m.evaluations.ifbench, fmt: fmtPct, dir: "max" },
      { label: "τ-bench (Tau2)", get: (m) => m.evaluations.tau2, fmt: fmtPct, dir: "max" },
      { label: "Terminal-Bench Hard", get: (m) => m.evaluations.terminalbench_hard, fmt: fmtPct, dir: "max" },
      { label: "tools", get: (m) => m.supported_parameters.includes("tools"), dir: "bool" },
      { label: "tool_choice", get: (m) => m.supported_parameters.includes("tool_choice"), dir: "bool" },
      { label: "structured_outputs", get: (m) => m.supported_parameters.includes("structured_outputs"), dir: "bool" },
      { label: "reasoning param", get: (m) => m.supported_parameters.includes("reasoning"), dir: "bool" },
    ],
  },
  {
    title: "Pricing",
    rows: [
      { label: "Input $/1M", get: (m) => m.pricing.input_1m, fmt: fmtUSD, dir: "min" },
      { label: "Output $/1M", get: (m) => m.pricing.output_1m, fmt: fmtUSD, dir: "min" },
      { label: "Cache read $/1M", get: (m) => m.pricing.cache_read_1m, fmt: fmtUSD, dir: "min" },
      { label: "Cache write $/1M", get: (m) => m.pricing.cache_write_1m, fmt: fmtUSD, dir: "min" },
      { label: "Blended (3:1) $/1M", get: (m) => m.pricing.blended_1m, fmt: fmtUSD, dir: "min" },
    ],
  },
];

const SECTIONS_AFTER_PROFILE_COSTS: { title: string; rows: Attr[] }[] = [
  {
    title: "Capacidades",
    rows: [
      { label: "Context window", get: (m) => m.context_length, fmt: fmtContext, dir: "max" },
      { label: "Max output", get: (m) => m.max_output_tokens, fmt: fmtContext, dir: "max" },
      { label: "Modalidade", get: (m) => m.modality, dir: "text", fmt: (v) => v ?? "—" },
      { label: "Input modalities", get: (m) => m.input_modalities.join(", "), dir: "text", fmt: (v) => v || "—" },
      { label: "Tokenizer", get: (m) => m.tokenizer, dir: "text", fmt: (v) => v ?? "—" },
    ],
  },
  {
    title: "Performance",
    rows: [
      { label: "Throughput (t/s)", get: (m) => m.performance.output_tokens_per_second, fmt: (v) => (v == null ? "—" : v.toFixed(0)), dir: "max" },
      { label: "TTFT (s)", get: (m) => m.performance.time_to_first_token_s, fmt: (v) => (v == null ? "—" : v.toFixed(1)), dir: "min" },
      { label: "TTFA pós-thinking (s)", get: (m) => m.performance.time_to_first_answer_s, fmt: (v) => (v == null ? "—" : v.toFixed(1)), dir: "min" },
    ],
  },
  {
    title: "Datas",
    rows: [
      { label: "Release", get: (m) => m.release_date, dir: "text", fmt: fmtDate },
      { label: "Adicionado OR", get: (m) => m.added_at, dir: "text", fmt: fmtDate },
      { label: "Knowledge cutoff", get: (m) => m.knowledge_cutoff, dir: "text", fmt: fmtDate },
    ],
  },
];

function isBestValue(value: any, attr: Attr, all: any[]): boolean {
  if (attr.dir === "text") return false;
  if (attr.dir === "bool") return value === true;
  const nums = all.filter((v) => typeof v === "number") as number[];
  if (nums.length === 0 || typeof value !== "number") return false;
  const best = attr.dir === "max" ? Math.max(...nums) : Math.min(...nums);
  return value === best && nums.length > 1;
}

function Cell({ raw, attr, all }: { raw: any; attr: Attr; all: any[] }) {
  const best = isBestValue(raw, attr, all);
  const formatted =
    attr.dir === "bool"
      ? raw === true
        ? "✓"
        : "—"
      : attr.fmt
      ? attr.fmt(raw)
      : String(raw ?? "—");
  return (
    <td
      className={`whitespace-nowrap border-b border-border/40 px-3 py-2 text-right text-sm tabular-nums ${
        best ? "font-semibold text-emerald-300" : "text-text"
      } ${attr.dir === "bool" && raw !== true ? "text-muted" : ""}`}
    >
      {formatted}
    </td>
  );
}

export function Compare({
  models,
  profiles,
  currentProfile,
  onRemove,
  onClose,
  onClear,
}: {
  models: ScoredModel[];
  profiles: ProfileInfo[];
  currentProfile: string;
  onRemove: (id: string) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const sections = useMemo(() => {
    const profileCostsRows: Attr[] = profiles.map((pf) => ({
      label: pf.label,
      hint: `${pf.cost_pattern} — ${pf.description}`,
      get: (m) => m.costs_by_profile?.[pf.key] ?? null,
      fmt: fmtUSD,
      dir: "min" as Dir,
      highlight: pf.key === currentProfile,
    }));
    const profileCostsSection = {
      title: "Custo por perfil de agente ($/1M)",
      rows: profileCostsRows,
    };
    return [
      ...SECTIONS_BEFORE_PROFILE_COSTS,
      profileCostsSection,
      ...SECTIONS_AFTER_PROFILE_COSTS,
    ];
  }, [profiles, currentProfile]);

  if (models.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm">
      <div className="m-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-4 border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Comparar <span className="text-text">({models.length})</span>
          </h2>
          <span className="text-xs text-muted">melhor por linha em verde</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={onClear}
              className="rounded-lg border border-border px-3 py-1 text-xs text-muted transition hover:border-accent/60 hover:text-text"
            >
              Limpar
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-1 text-xs text-text transition hover:bg-surface-2"
            >
              Fechar
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr>
                <th className="sticky left-0 z-20 min-w-[14rem] border-b border-border bg-surface px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  Atributo
                </th>
                {models.map((m) => (
                  <th key={m.id} className="min-w-[14rem] border-b border-border px-3 py-3 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <TierBadge tier={m.tier} />
                          <span className="truncate text-sm font-semibold text-text">{m.name}</span>
                        </div>
                        <div className="truncate font-mono text-[11px] text-muted">{m.id}</div>
                      </div>
                      <button
                        onClick={() => onRemove(m.id)}
                        className="shrink-0 rounded text-muted hover:text-text"
                        title="Remover da comparação"
                      >
                        ✕
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((sec) => (
                <Fragment key={sec.title}>
                  <tr>
                    <td
                      colSpan={1 + models.length}
                      className="sticky left-0 bg-surface-2/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent-soft"
                    >
                      {sec.title}
                    </td>
                  </tr>
                  {sec.rows.map((attr) => {
                    const vals = models.map((m) => attr.get(m));
                    return (
                      <tr key={`${sec.title}-${attr.label}`} className={attr.highlight ? "bg-accent/5" : ""}>
                        <td
                          className={`sticky left-0 z-[1] whitespace-nowrap border-b border-border/40 px-4 py-2 text-left text-xs ${
                            attr.highlight
                              ? "bg-accent/10 font-medium text-accent-soft"
                              : "bg-surface text-muted"
                          }`}
                          title={attr.hint}
                        >
                          {attr.highlight && <span className="mr-1">●</span>}
                          {attr.label}
                        </td>
                        {vals.map((v, i) => (
                          <Cell key={models[i].id} raw={v} attr={attr} all={vals} />
                        ))}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
