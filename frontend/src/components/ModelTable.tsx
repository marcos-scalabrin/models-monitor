import { useMemo, useState } from "react";
import type { ScoredModel, Tier } from "../types";
import { TIER_ORDER, fmtContext, fmtScore, fmtUSD } from "../lib";
import { TierBadge } from "./TierBadge";

type SortKey = "value_ratio" | "benchmark_score" | "intelligence" | "cost_for_profile" | "name";

const SORTABLE: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Modelo", numeric: false },
  { key: "intelligence", label: "Intel", numeric: true },
  { key: "benchmark_score", label: "Bench", numeric: true },
  { key: "cost_for_profile", label: "Custo/1M", numeric: true },
  { key: "value_ratio", label: "Value", numeric: true },
];

function getVal(m: ScoredModel, key: SortKey): number | string | null {
  if (key === "name") return m.name.toLowerCase();
  if (key === "intelligence") return m.evaluations.intelligence;
  return m[key];
}

export function ModelTable({
  models,
  onSelect,
  selectedId,
  compareIds,
  onToggleCompare,
}: {
  models: ScoredModel[];
  onSelect: (m: ScoredModel) => void;
  selectedId?: string;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("value_ratio");
  const [asc, setAsc] = useState(false);
  const [tierFilter, setTierFilter] = useState<Tier | "all">("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    let r = models;
    if (tierFilter !== "all") r = r.filter((m) => m.tier === tierFilter);
    if (query) {
      const q = query.toLowerCase();
      r = r.filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    }
    const sorted = [...r].sort((a, b) => {
      const va = getVal(a, sortKey);
      const vb = getVal(b, sortKey);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [models, tierFilter, query, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((a) => !a);
    else {
      setSortKey(key);
      setAsc(key === "name");
    }
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-surface/70 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Modelos <span className="text-text">({rows.length})</span>
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
            <button
              onClick={() => setTierFilter("all")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${tierFilter === "all" ? "bg-accent/20 text-accent-soft" : "text-muted hover:text-text"}`}
            >
              Todos
            </button>
            {TIER_ORDER.map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`rounded-md px-2 py-1 text-xs font-bold transition ${tierFilter === t ? "bg-accent/20 text-accent-soft" : "text-muted hover:text-text"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar modelo…"
            className="w-44 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-text outline-none placeholder:text-muted focus:border-accent/60"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2.5 pl-4 pr-2 font-medium">Tier</th>
              <th className="py-2.5 px-2 text-center font-medium" title="Adicionar à comparação">
                Comp.
              </th>
              {SORTABLE.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className={`cursor-pointer select-none py-2.5 px-2 font-medium hover:text-text ${c.numeric ? "text-right" : ""}`}
                >
                  {c.label}
                  {sortKey === c.key && <span className="ml-1 text-accent-soft">{asc ? "▲" : "▼"}</span>}
                </th>
              ))}
              <th className="py-2.5 px-2 text-right font-medium">Ctx</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr
                key={m.id}
                onClick={() => onSelect(m)}
                className={`cursor-pointer border-t border-border/60 transition hover:bg-surface-2/60 ${selectedId === m.id ? "bg-accent/10" : ""}`}
              >
                <td className="py-2 pl-4 pr-2"><TierBadge tier={m.tier} /></td>
                <td
                  className="py-2 px-2 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={compareIds.includes(m.id)}
                    onChange={() => onToggleCompare(m.id)}
                    className="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
                    aria-label={`Comparar ${m.name}`}
                  />
                </td>
                <td className="py-2 px-2">
                  <div className="font-mono text-text">{m.id}</div>
                  <div className="text-xs text-muted">{m.creator}</div>
                </td>
                <td className="py-2 px-2 text-right tabular-nums">{fmtScore(m.evaluations.intelligence)}</td>
                <td className="py-2 px-2 text-right tabular-nums">{fmtScore(m.benchmark_score)}</td>
                <td className="py-2 px-2 text-right tabular-nums">{fmtUSD(m.cost_for_profile)}</td>
                <td className="py-2 px-2 text-right font-semibold tabular-nums text-accent-soft">
                  {m.value_ratio ?? "—"}
                </td>
                <td className="py-2 px-2 text-right tabular-nums text-muted">{fmtContext(m.context_length)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
