import type { Tier } from "../types";
import { TIER_COLORS, TIER_LABELS } from "../lib";

export function TierBadge({ tier, withLabel = false }: { tier: Tier | null; withLabel?: boolean }) {
  if (!tier) return <span className="text-muted">—</span>;
  const color = TIER_COLORS[tier];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
      title={TIER_LABELS[tier]}
    >
      <span className="font-bold">{tier}</span>
      {withLabel && <span className="font-medium opacity-80">{TIER_LABELS[tier]}</span>}
    </span>
  );
}
