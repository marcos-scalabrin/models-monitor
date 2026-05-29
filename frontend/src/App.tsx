import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import type { MetaInfo, ProfileInfo, Recommendation, ScoredModel } from "./types";
import { Header } from "./components/Header";
import { FilterBar, DEFAULT_FILTERS, type Filters } from "./components/FilterBar";
import { CostPerformanceMap } from "./components/CostPerformanceMap";
import { RecommendationPanel } from "./components/RecommendationPanel";
import { ModelTable } from "./components/ModelTable";
import { ModelDetail } from "./components/ModelDetail";
import { Compare } from "./components/Compare";

const BENCH_LABEL: Record<string, string> = {
  intelligence: "Intelligence Index",
  coding: "Coding Index",
  math: "Math Index",
};

export default function App() {
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [profile, setProfile] = useState("orchestrator");
  const [alpha, setAlpha] = useState(0.5);

  const [models, setModels] = useState<ScoredModel[]>([]);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [meta, setMeta] = useState<MetaInfo | null>(null);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const [selected, setSelected] = useState<ScoredModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // initial load
  useEffect(() => {
    Promise.all([api.profiles(), api.meta()])
      .then(([p, m]) => {
        setProfiles(p);
        setMeta(m);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // load scored models + recommendation whenever profile/alpha changes (debounced)
  const debounce = useRef<number | undefined>(undefined);
  useEffect(() => {
    setLoading(true);
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      Promise.all([api.models(profile, alpha), api.recommend(profile, alpha, 3)])
        .then(([ms, r]) => {
          setModels(ms);
          setRec(r);
          setError(null);
        })
        .catch((e) => setError(String(e)))
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(debounce.current);
  }, [profile, alpha]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const m = await api.refresh();
      setMeta(m);
      const [ms, r] = await Promise.all([
        api.models(profile, alpha),
        api.recommend(profile, alpha, 3),
      ]);
      setModels(ms);
      setRec(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setRefreshing(false);
    }
  }

  const current = useMemo(() => profiles.find((p) => p.key === profile), [profiles, profile]);
  const benchLabel = current
    ? BENCH_LABEL[current.primary_benchmark] ?? current.primary_benchmark
    : "Benchmark";

  const creators = useMemo(() => {
    const s = new Set<string>();
    for (const m of models) if (m.creator) s.add(m.creator);
    return Array.from(s).sort();
  }, [models]);

  const toggleCompare = (id: string) =>
    setCompareIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 6 ? ids : [...ids, id],
    );

  const compareModels = useMemo(
    () =>
      compareIds
        .map((id) => models.find((m) => m.id === id))
        .filter((m): m is ScoredModel => Boolean(m)),
    [compareIds, models],
  );

  const filtered = useMemo(
    () =>
      models.filter((m) => {
        if (filters.onlyBenchmarked && m.benchmark_score == null) return false;
        if (filters.hideFiltered && m.tier === "F") return false;
        if (filters.minIntelligence > 0 && (m.evaluations.intelligence ?? -1) < filters.minIntelligence)
          return false;
        if (filters.creators.length > 0 && !filters.creators.includes(m.creator ?? "")) return false;
        return true;
      }),
    [models, filters],
  );

  return (
    <div className="flex h-full flex-col">
      <Header
        profiles={profiles}
        profile={profile}
        onProfile={setProfile}
        alpha={alpha}
        onAlpha={setAlpha}
        meta={meta}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-2 text-sm text-red-300">
          Erro: {error} — o backend está rodando em :8890?
        </div>
      )}

      <FilterBar
        filters={filters}
        onChange={setFilters}
        creators={creators}
        shown={filtered.length}
        total={models.length}
      />

      <main className="grid min-h-0 flex-1 grid-cols-12 gap-5 overflow-auto p-5">
        <div className="col-span-12 min-h-[460px] lg:col-span-8">
          <CostPerformanceMap models={filtered} benchmarkLabel={benchLabel} onSelect={setSelected} />
        </div>

        <div className="col-span-12 flex flex-col gap-5 lg:col-span-4">
          {current && (
            <section className="rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur">
              <h2 className="mb-1 text-sm font-semibold text-text">{current.label}</h2>
              <p className="mb-3 text-xs leading-relaxed text-muted">{current.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-surface-2/50 px-2.5 py-1.5">
                  <div className="text-muted">Benchmark</div>
                  <div className="font-medium text-text">{benchLabel}</div>
                </div>
                <div className="rounded-lg bg-surface-2/50 px-2.5 py-1.5">
                  <div className="text-muted">Cache</div>
                  <div className="font-medium text-text">{current.cache}</div>
                </div>
                <div className="col-span-2 rounded-lg bg-surface-2/50 px-2.5 py-1.5">
                  <div className="text-muted">Padrão de token</div>
                  <div className="font-medium text-text">{current.token_pattern}</div>
                </div>
              </div>
            </section>
          )}
          <RecommendationPanel rec={rec} loading={loading} onSelect={setSelected} />
        </div>

        <div className="col-span-12 min-h-[420px]">
          <ModelTable
            models={filtered}
            onSelect={setSelected}
            selectedId={selected?.id}
            compareIds={compareIds}
            onToggleCompare={toggleCompare}
          />
        </div>
      </main>

      <ModelDetail
        model={selected}
        profiles={profiles}
        currentProfile={profile}
        onClose={() => setSelected(null)}
        onCompare={toggleCompare}
        inCompare={selected ? compareIds.includes(selected.id) : false}
      />

      {compareIds.length > 0 && !compareOpen && (
        <button
          onClick={() => setCompareOpen(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full border border-accent/40 bg-accent/90 px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-accent/40 transition hover:bg-accent"
        >
          Comparar ({compareIds.length})
        </button>
      )}

      {compareOpen && (
        <Compare
          models={compareModels}
          profiles={profiles}
          currentProfile={profile}
          onRemove={toggleCompare}
          onClose={() => setCompareOpen(false)}
          onClear={() => {
            setCompareIds([]);
            setCompareOpen(false);
          }}
        />
      )}
    </div>
  );
}
