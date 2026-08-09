import { useMemo, useState, type WheelEvent } from "react";
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

type Domain = [number, number];

interface Viewport {
  x: Domain;
  y: Domain;
  boundsKey: string;
}

const ZOOM_FACTOR = 1.6;

function ticksFor([lo, hi]: Domain): number[] {
  const step = (hi - lo) / 5;
  return Array.from({ length: 6 }, (_, index) => lo + step * index);
}

function zoomDomain(current: Domain, bounds: Domain, factor: number): Domain {
  const [currentLo, currentHi] = current;
  const [boundLo, boundHi] = bounds;
  const boundSpan = boundHi - boundLo;
  const targetSpan = Math.min(boundSpan, Math.max(boundSpan / 64, (currentHi - currentLo) / factor));
  const center = (currentLo + currentHi) / 2;
  let lo = center - targetSpan / 2;
  let hi = center + targetSpan / 2;

  if (lo < boundLo) {
    hi += boundLo - lo;
    lo = boundLo;
  }
  if (hi > boundHi) {
    lo -= hi - boundHi;
    hi = boundHi;
  }
  return [lo, hi];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
}) {
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
  const { byTier, xDomain, yDomain } = useMemo(() => {
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
    return {
      byTier: groups,
      xDomain: [lo, hi] as Domain,
      yDomain: [0, 100] as Domain,
    };
  }, [models]);

  const [viewport, setViewport] = useState<Viewport | null>(null);
  const boundsKey = `${xDomain[0]}:${xDomain[1]}:${yDomain[0]}:${yDomain[1]}`;
  // A viewport belongs to a particular dataset/filter range. Treat an old one
  // as reset instead of setting state from an effect when the data changes.
  const activeViewport = viewport?.boundsKey === boundsKey ? viewport : null;

  const visible = activeViewport ?? { x: xDomain, y: yDomain };
  const zoomed = activeViewport !== null;

  function zoom(factor: number) {
    setViewport((current) => {
      const active = current?.boundsKey === boundsKey ? current : { x: xDomain, y: yDomain };
      const next = {
        x: zoomDomain(active.x, xDomain, factor),
        y: zoomDomain(active.y, yDomain, factor),
      };
      if (next.x[0] === xDomain[0] && next.x[1] === xDomain[1] && next.y[0] === yDomain[0] && next.y[1] === yDomain[1]) {
        return null;
      }
      return { ...next, boundsKey };
    });
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    // Trackpad pinch is reported as ctrl+wheel by browsers; requiring a
    // modifier also keeps ordinary page scrolling intact.
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoom(event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR);
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Mapa custo × performance
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {TIER_ORDER.filter((t) => t !== "F").map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIER_COLORS[t] }} />
              {t} · {TIER_LABELS[t]}
            </span>
          ))}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1" aria-label="Controles de zoom do mapa">
            <button
              type="button"
              onClick={() => zoom(ZOOM_FACTOR)}
              className="rounded px-2 py-1 font-semibold text-text transition hover:bg-surface hover:text-accent-soft"
              aria-label="Ampliar mapa"
              title="Ampliar"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => zoom(1 / ZOOM_FACTOR)}
              className="rounded px-2 py-1 font-semibold text-text transition hover:bg-surface hover:text-accent-soft"
              aria-label="Reduzir mapa"
              title="Reduzir"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setViewport(null)}
              disabled={!zoomed}
              className="rounded px-2 py-1 text-muted transition hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Restaurar visão completa do mapa"
              title="Restaurar visão completa"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div
        className="min-h-0 flex-1"
        onWheel={handleWheel}
        aria-label="Mapa interativo. Use os controles ou Ctrl mais roda do mouse para aplicar zoom."
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.5} />
            <XAxis
              type="number"
              dataKey="x"
              name="Custo"
              domain={visible.x}
              ticks={ticksFor(visible.x)}
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
              domain={visible.y}
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
                onClick={(point: unknown) => {
                  const model = (point as { model?: ScoredModel } | undefined)?.model;
                  if (model) onSelect(model);
                }}
                className="cursor-pointer"
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
