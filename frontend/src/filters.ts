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
