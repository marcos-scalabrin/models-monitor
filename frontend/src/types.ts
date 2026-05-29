export type Tier = "S" | "A" | "B" | "C" | "F";

export interface Evaluations {
  intelligence: number | null;
  coding: number | null;
  math: number | null;
  gpqa: number | null;
  hle: number | null;
  mmlu_pro: number | null;
  scicode: number | null;
  math_500: number | null;
  aime: number | null;
  aime_25: number | null;
  livecodebench: number | null;
  ifbench: number | null;
  tau2: number | null;
  terminalbench_hard: number | null;
  lcr: number | null;
}

export interface Pricing {
  input_1m: number | null;
  output_1m: number | null;
  blended_1m: number | null;
  cache_read_1m: number | null;
  cache_write_1m: number | null;
  cache_estimated: boolean;
  source: string;
}

export interface Performance {
  output_tokens_per_second: number | null;
  time_to_first_token_s: number | null;
  time_to_first_answer_s: number | null;
}

export interface ScoredModel {
  id: string;
  name: string;
  creator: string | null;
  description: string | null;
  release_date: string | null;
  added_at: string | null;
  knowledge_cutoff: string | null;
  context_length: number | null;
  max_output_tokens: number | null;
  modality: string | null;
  input_modalities: string[];
  output_modalities: string[];
  tokenizer: string | null;
  supported_parameters: string[];
  evaluations: Evaluations;
  pricing: Pricing;
  performance: Performance;
  sources: string[];
  openrouter_id: string | null;
  aa_slug: string | null;
  profile: string;
  benchmark_score: number | null;
  cost_for_profile: number | null;
  value_ratio: number | null;
  tier: Tier | null;
  costs_by_profile: Record<string, number | null>;
}

export interface ProfileInfo {
  key: string;
  label: string;
  primary_benchmark: string;
  secondary_benchmark: string | null;
  token_pattern: string;
  cache: string;
  description: string;
  cost_pattern: string;  // "input-pesado" | "output-pesado" | "balanceado" | "agentic-cache"
}

export interface Recommendation {
  profile: string;
  primary: ScoredModel | null;
  fallbacks: ScoredModel[];
}

export interface MetaInfo {
  total_models: number;
  matched_models: number;
  openrouter_only: number;
  aa_only: number;
  last_updated: string | null;
  source_mode: string;
  aa_available: boolean;
}
