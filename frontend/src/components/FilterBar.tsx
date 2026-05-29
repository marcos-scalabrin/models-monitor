export interface Filters {
  minIntelligence: number;
  creators: string[];          // empty array = all providers
  onlyBenchmarked: boolean;
  hideFiltered: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  minIntelligence: 0,
  creators: [],
  onlyBenchmarked: false,
  hideFiltered: false,
};

function isDefault(f: Filters): boolean {
  return (
    f.minIntelligence === 0 &&
    f.creators.length === 0 &&
    !f.onlyBenchmarked &&
    !f.hideFiltered
  );
}

function ProviderPicker({
  creators,
  selected,
  onChange,
}: {
  creators: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (c: string) => {
    onChange(selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c]);
  };
  const label =
    selected.length === 0
      ? "Todos"
      : selected.length <= 2
      ? selected.join(", ")
      : `${selected.length} selecionados`;

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-text outline-none hover:border-accent/60 [&::-webkit-details-marker]:hidden">
        <span className="max-w-[12rem] truncate">{label}</span>
        <span className="text-muted">▾</span>
      </summary>
      <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-lg border border-border bg-surface p-2 shadow-2xl">
        <div className="mb-1 flex items-center justify-between px-1 text-xs text-muted">
          <span>{selected.length || "0"} de {creators.length}</span>
          {selected.length > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onChange([]);
              }}
              className="text-accent-soft hover:underline"
            >
              limpar
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-auto">
          {creators.map((c) => (
            <label
              key={c}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-surface-2"
            >
              <input
                type="checkbox"
                checked={selected.includes(c)}
                onChange={() => toggle(c)}
                className="accent-[var(--color-accent)]"
              />
              <span className="truncate text-text">{c}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

export function FilterBar({
  filters,
  onChange,
  creators,
  shown,
  total,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  creators: string[];
  shown: number;
  total: number;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-surface/30 px-6 py-2.5 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Filtros</span>

      <label className="flex items-center gap-2">
        <span className="text-xs text-muted">Intelligence ≥</span>
        <input
          type="range"
          min={0}
          max={80}
          step={1}
          value={filters.minIntelligence}
          onChange={(e) => set({ minIntelligence: Number(e.target.value) })}
          className="w-28"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={filters.minIntelligence}
          onChange={(e) => set({ minIntelligence: Number(e.target.value) || 0 })}
          className="w-14 rounded-md border border-border bg-surface-2 px-2 py-1 text-right text-xs tabular-nums text-text outline-none focus:border-accent/60"
        />
      </label>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Providers</span>
        <ProviderPicker
          creators={creators}
          selected={filters.creators}
          onChange={(creators) => set({ creators })}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
        <input
          type="checkbox"
          checked={filters.onlyBenchmarked}
          onChange={(e) => set({ onlyBenchmarked: e.target.checked })}
          className="accent-[var(--color-accent)]"
        />
        Só com benchmark
      </label>

      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
        <input
          type="checkbox"
          checked={filters.hideFiltered}
          onChange={(e) => set({ hideFiltered: e.target.checked })}
          className="accent-[var(--color-accent)]"
        />
        Ocultar tier F
      </label>

      <div className="ml-auto flex items-center gap-3 text-xs text-muted">
        <span>
          <b className="text-text">{shown}</b>/{total} modelos
        </span>
        {!isDefault(filters) && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="rounded-md border border-border px-2 py-1 text-muted transition hover:border-accent/60 hover:text-text"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
