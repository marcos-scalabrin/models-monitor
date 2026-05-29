import type { Tier } from "./types";

export const TIER_COLORS: Record<Tier, string> = {
  S: "var(--color-tier-s)",
  A: "var(--color-tier-a)",
  B: "var(--color-tier-b)",
  C: "var(--color-tier-c)",
  F: "var(--color-tier-f)",
};

export const TIER_LABELS: Record<Tier, string> = {
  S: "Frontier",
  A: "High Value",
  B: "Balanced",
  C: "Economy",
  F: "Filtrado",
};

export const TIER_ORDER: Tier[] = ["S", "A", "B", "C", "F"];

export function fmtUSD(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v === 0) return "$0";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  if (v < 1) return `$${v.toFixed(3)}`;
  if (v < 100) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(0)}`;
}

export function fmtScore(v: number | null | undefined): string {
  return v == null ? "—" : v.toFixed(1);
}

export function fmtPct(v: number | null | undefined): string {
  return v == null ? "—" : `${v.toFixed(1)}%`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(+d)
    ? iso
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtContext(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)}M`;
  if (v >= 1_000) return `${Math.round(v / 1000)}k`;
  return String(v);
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}
