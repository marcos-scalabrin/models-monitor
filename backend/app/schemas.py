"""Pydantic schemas for the public API and internal data model."""

from __future__ import annotations

from pydantic import BaseModel, Field


class Evaluations(BaseModel):
    """Benchmark scores sourced from Artificial Analysis. All on a 0-100 scale
    (raw fraction benchmarks like GPQA are scaled in the parser)."""

    # composite indices
    intelligence: float | None = None
    coding: float | None = None
    math: float | None = None
    # reasoning / academic
    gpqa: float | None = None              # GPQA Diamond — graduate science
    hle: float | None = None               # Humanity's Last Exam — extreme reasoning
    mmlu_pro: float | None = None
    scicode: float | None = None
    math_500: float | None = None
    aime: float | None = None
    aime_25: float | None = None
    # coding
    livecodebench: float | None = None
    # orchestration / agentic / tool-use
    ifbench: float | None = None              # instruction-following
    tau2: float | None = None                  # tool-use agent benchmark
    terminalbench_hard: float | None = None    # terminal-bench (hard)
    lcr: float | None = None                   # long-context reasoning


class Pricing(BaseModel):
    """Per-1M-token pricing in USD. Source noted in `source`."""

    input_1m: float | None = None
    output_1m: float | None = None
    blended_1m: float | None = None          # AA 3:1 blended, when available
    cache_read_1m: float | None = None        # explicit or estimated
    cache_write_1m: float | None = None
    cache_estimated: bool = False             # True if cache prices were inferred
    source: str = "unknown"                   # "openrouter" | "artificial_analysis"


class Performance(BaseModel):
    output_tokens_per_second: float | None = None
    time_to_first_token_s: float | None = None
    # For reasoning models, this is the latency to the first *answer* token
    # (after the thinking phase) — much more meaningful than raw TTFT.
    time_to_first_answer_s: float | None = None


class Model(BaseModel):
    """A single model, joined across sources."""

    id: str                              # canonical id, OpenRouter-style "creator/model"
    name: str
    creator: str | None = None
    description: str | None = None
    release_date: str | None = None       # ISO YYYY-MM-DD (from Artificial Analysis)
    added_at: str | None = None           # ISO date (when OpenRouter first listed it)
    knowledge_cutoff: str | None = None

    context_length: int | None = None
    max_output_tokens: int | None = None
    modality: str | None = None
    input_modalities: list[str] = Field(default_factory=list)
    output_modalities: list[str] = Field(default_factory=list)
    tokenizer: str | None = None
    supported_parameters: list[str] = Field(default_factory=list)

    evaluations: Evaluations = Field(default_factory=Evaluations)
    pricing: Pricing = Field(default_factory=Pricing)
    performance: Performance = Field(default_factory=Performance)

    # provenance / debug
    sources: list[str] = Field(default_factory=list)  # ["openrouter", "artificial_analysis"]
    openrouter_id: str | None = None
    aa_slug: str | None = None


class ScoredModel(Model):
    """A model annotated with value scoring for a specific agent profile."""

    profile: str
    benchmark_score: float | None = None     # the profile's primary benchmark value
    cost_for_profile: float | None = None    # weighted $/1M for this profile's pattern
    value_ratio: float | None = None         # benchmark / cost^alpha
    tier: str | None = None                  # S | A | B | C | F
    # weighted $/1M under every profile's cost function — same pricing,
    # different weighting. Lets the UI show what each agent type would pay.
    costs_by_profile: dict[str, float | None] = Field(default_factory=dict)


class ProfileInfo(BaseModel):
    key: str
    label: str
    primary_benchmark: str
    secondary_benchmark: str | None = None
    token_pattern: str
    cache: str
    description: str
    cost_pattern: str = "balanceado"  # input-pesado | output-pesado | agentic-cache | balanceado


class Recommendation(BaseModel):
    profile: str
    primary: ScoredModel | None = None
    fallbacks: list[ScoredModel] = Field(default_factory=list)


class MetaInfo(BaseModel):
    total_models: int
    matched_models: int
    openrouter_only: int
    aa_only: int
    last_updated: str | None = None
    source_mode: str  # "live" | "fixtures"
    aa_available: bool
