import type { Tier } from "./types";

export interface Filters {
  query: string;
  tier: Tier | "all";
  minIntelligence: number;
  creators: string[];          // empty array = all providers
  onlyBenchmarked: boolean;
  hideFiltered: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  query: "",
  tier: "all",
  minIntelligence: 0,
  creators: [],
  onlyBenchmarked: false,
  hideFiltered: false,
};
