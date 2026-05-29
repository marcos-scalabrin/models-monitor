import { useMemo } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { ScoredModel, Tier } from "../types";
import { TIER_COLORS, TIER_LABELS, TIER_ORDER, fmtScore, fmtUSD } from "../lib";

interface Point {
  x: number;
  y: number;
  z: number;
  model: ScoredModel;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: Point = payload[0].payload;
  const m = p.model;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 font-bold"
          style={{ color: TIER_COLORS[m.tier ?? "F"], backgroundColor: "color-mix(in srgb, currentColor 16%, transparent)" }}
        >
          {m.tier}
        </span>
        <span className="font-mono text-text">{m.id}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted">
        <span>Benchmark</span><span className="text-right text-text">{fmtScore(m.benchmark_score)}</span>
        <span>Custo perfil</span><span className="text-right text-text">{fmtUSD(m.cost_for_profile)}/1M</span>
        <span>Value ratio</span><span className="text-right text-accent-soft">{m.value_ratio ?? "—"}</span>
        <span>Throughput</span><span className="text-right text-text">{m.performance.output_tokens_per_second?.toFixed(0) ?? "—"} t/s</span>
      </div>
    </div>
  );
}

export function CostPerformanceMap({
  models,
  benchmarkLabel,
  onSelect,
}: {
  models: ScoredModel[];
  benchmarkLabel: string;
  onSelect: (m: ScoredModel) => void;
}) {
  // We transform cost to log10 ourselves and use a linear axis — Recharts'
  // built-in scale="log" mispositions scatter points (renders axis, drops dots).
  const { byTier, xDomain, xTicks } = useMemo(() => {
    const groups: Record<Tier, Point[]> = { S: [], A: [], B: [], C: [], F: [] };
    let min = Infinity;
    let max = -Infinity;
    for (const m of models) {
      if (m.benchmark_score == null || m.cost_for_profile == null) continue;
      const tier = (m.tier ?? "F") as Tier;
      const cost = Math.max(m.cost_for_profile, 0.01);
      const x = Math.log10(cost);
      min = Math.min(min, x);
      max = Math.max(max, x);
      groups[tier].push({
        x,
        y: m.benchmark_score,
        z: m.performance.output_tokens_per_second ?? 40,
        model: m,
      });
    }
    const lo = Number.isFinite(min) ? Math.floor(min * 2) / 2 - 0.1 : -1;
    const hi = Number.isFinite(max) ? Math.ceil(max * 2) / 2 + 0.1 : 2;
    const ticks: number[] = [];
    const step = (hi - lo) / 5;
    for (let i = 0; i <= 5; i++) ticks.push(lo + step * i);
    return { byTier: groups, xDomain: [lo, hi] as [number, number], xTicks: ticks };
  }, [models]);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Mapa custo × performance
        </h2>
        <div className="flex flex-wrap gap-3 text-xs">
          {TIER_ORDER.filter((t) => t !== "F").map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIER_COLORS[t] }} />
              {t} · {TIER_LABELS[t]}
            </span>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.5} />
            <XAxis
              type="number"
              dataKey="x"
              name="Custo"
              domain={xDomain}
              ticks={xTicks}
              allowDataOverflow
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              tickFormatter={(v) => fmtUSD(10 ** v)}
              label={{
                value: "Custo do perfil — $/1M tokens (log)",
                position: "insideBottom",
                offset: -25,
                fill: "var(--color-muted)",
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Benchmark"
              domain={[0, 100]}
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              label={{
                value: benchmarkLabel,
                angle: -90,
                position: "insideLeft",
                fill: "var(--color-muted)",
                fontSize: 12,
              }}
            />
            <ZAxis type="number" dataKey="z" range={[40, 420]} name="Throughput" />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "var(--color-accent)" }} />
            {TIER_ORDER.map((tier) => (
              <Scatter
                key={tier}
                name={tier}
                data={byTier[tier]}
                fill={TIER_COLORS[tier]}
                fillOpacity={tier === "F" ? 0.3 : 0.8}
                stroke={TIER_COLORS[tier]}
                strokeOpacity={0.9}
                isAnimationActive={false}
                onClick={(d: any) => d?.model && onSelect(d.model)}
                className="cursor-pointer"
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
