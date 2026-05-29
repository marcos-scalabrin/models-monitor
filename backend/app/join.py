"""Merge OpenRouter (pricing/capabilities) with Artificial Analysis (benchmarks).

The two sources use different identifiers, so matching relies on normalized
creator aliases plus a token-set similarity over model names/slugs.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .cache_rules import estimate_cache
from .schemas import Evaluations, Model, Performance, Pricing
from .sources.artificial_analysis import AAModel
from .sources.openrouter import ORModel

# --- creator normalization -------------------------------------------------

_CREATOR_ALIASES = {
    "meta-llama": "meta",
    "meta_llama": "meta",
    "llama": "meta",
    "mistralai": "mistral",
    "x-ai": "xai",
    "google-deepmind": "google",
    "googledeepmind": "google",
    "deepseek-ai": "deepseek",
    "alibaba": "qwen",
    "qwen": "qwen",
    "nous": "nousresearch",
    "nousresearch": "nousresearch",
    "z-ai": "zhipu",
    "zhipuai": "zhipu",
    "moonshotai": "moonshot",
    "moonshot": "moonshot",
}

# tokens that carry no discriminating signal for matching
_NOISE = {
    "instruct", "chat", "preview", "latest", "the", "model", "ai",
    "exp", "experimental", "it", "text", "online",
    # reasoning-effort descriptors that Artificial Analysis appends per variant
    # (e.g. "Claude Opus 4.7 (Adaptive Reasoning, Max Effort)"). These describe
    # the benchmark config, not the model identity. We keep mini/nano/max/high/
    # low/medium since those are real model distinctions.
    "reasoning", "thinking", "adaptive", "effort", "minimal", "xhigh",
    "nonreasoning", "high", "low",
    # NOTE: deliberately NOT noising "medium" — it is a real model identity
    # ("Mistral Medium"). "high"/"low" are only reasoning-effort labels here.
}


# Product-tier suffixes. These are IDENTITY (not noise/effort), so a match
# is only valid when both sides carry the same set — otherwise "mimo-v2.5"
# would wrongly bind to "mimo-v2.5-pro". Note: deliberately omits ambiguous
# words like "max"/"medium"/"high"/"low" which already serve dual purposes
# elsewhere (Qwen Max, Mistral Medium, reasoning-effort labels).
_TIER_MARKERS = frozenset({
    "pro", "mini", "nano", "flash", "ultra", "turbo", "lite",
    "plus", "base", "micro", "scout", "maverick",
})


def _tier_markers(tokens: frozenset[str]) -> frozenset[str]:
    return tokens & _TIER_MARKERS


def _is_date_token(t: str) -> bool:
    """Date-ish numeric suffixes (20260101, 2603, 2512) — not model identity."""
    if not t.isdigit():
        return False
    if len(t) == 8 and t.startswith("20"):
        return True
    if len(t) == 4 and t[0] == "2":
        return True
    return False


# alias keys reduced to alphanumeric so "meta-llama" and "metallama" both map
_CREATOR_ALIASES_NORM = {
    re.sub(r"[^a-z0-9]", "", k): v for k, v in _CREATOR_ALIASES.items()
}


def norm_creator(c: str | None) -> str:
    c = (c or "").strip().lower()
    c = re.sub(r"[^a-z0-9]", "", c)
    return _CREATOR_ALIASES_NORM.get(c, c)


def _tokens(*parts: str | None) -> frozenset[str]:
    raw = " ".join(p for p in parts if p)
    raw = raw.lower()
    # drop a provider prefix like "anthropic:" or "anthropic/"
    raw = re.sub(r"[:/]", " ", raw)
    toks = re.split(r"[^a-z0-9]+", raw)
    return frozenset(
        t for t in toks if t and t not in _NOISE and not _is_date_token(t)
    )


def _identity_tokens(creator: str | None, *parts: str | None) -> frozenset[str]:
    """Tokens that identify a model, with the creator name removed so it does
    not leak in from names like 'Anthropic: Claude Opus 4.7'."""
    return _tokens(*parts) - _tokens(creator)


def _similarity(a: frozenset[str], b: frozenset[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    jaccard = inter / union
    # bonus: smaller set fully contained in the larger (e.g. base vs variant)
    contained = inter / min(len(a), len(b))
    return 0.5 * jaccard + 0.5 * contained


_MATCH_THRESHOLD = 0.62


# --- OpenRouter de-duplication --------------------------------------------

def dedup_openrouter(models: list[ORModel]) -> list[ORModel]:
    """Collapse `:free` / `:nitro` / etc. variants onto their base id."""
    by_base: dict[str, ORModel] = {}
    for m in models:
        base = m.id.split(":", 1)[0]
        existing = by_base.get(base)
        if existing is None:
            by_base[base] = m
        else:
            # prefer the entry whose id has no variant suffix
            if ":" in existing.id and ":" not in m.id:
                by_base[base] = m
    return list(by_base.values())


# --- matching --------------------------------------------------------------

@dataclass
class _AAIndexEntry:
    model: AAModel
    creator: str
    tokens: frozenset[str]


def _index_aa(aa_models: list[AAModel]) -> list[_AAIndexEntry]:
    out = []
    for a in aa_models:
        creator = a.creator_slug or a.creator_name
        out.append(
            _AAIndexEntry(
                model=a,
                creator=norm_creator(creator),
                tokens=_identity_tokens(creator, a.name, a.slug),
            )
        )
    return out


def _best_aa_match(
    or_model: ORModel, aa_index: list[_AAIndexEntry]
) -> tuple[AAModel | None, float]:
    or_creator = norm_creator(or_model.creator)
    or_tokens = _identity_tokens(
        or_model.creator,
        or_model.name,
        or_model.id.split("/", 1)[-1],
        or_model.canonical_slug,
    )
    or_markers = _tier_markers(or_tokens)
    best: AAModel | None = None
    best_score = 0.0
    for entry in aa_index:
        # require creator agreement (cheap, high-precision gate)
        if entry.creator and or_creator and entry.creator != or_creator:
            continue
        # require the same product-tier markers on both sides — otherwise a
        # base model would wrongly bind to its "-pro"/"-mini"/etc. variant.
        if _tier_markers(entry.tokens) != or_markers:
            continue
        score = _similarity(or_tokens, entry.tokens)
        if score > best_score:
            best, best_score = entry.model, score
        elif best is not None and abs(score - best_score) < 1e-6:
            # tie: AA lists the same model under several reasoning-effort
            # variants (minimal/low/.../xhigh). Prefer the highest-intelligence
            # one so we represent the model's capability ceiling, not "minimal".
            if (entry.model.intelligence or -1) > (best.intelligence or -1):
                best = entry.model
    return (best, best_score) if best_score >= _MATCH_THRESHOLD else (None, best_score)


# --- model construction ----------------------------------------------------

def _build_pricing(or_m: ORModel | None, aa_m: AAModel | None) -> Pricing:
    # Prefer OpenRouter pricing (real, per-provider). Fall back to AA.
    input_1m = (or_m.input_1m if or_m else None)
    output_1m = (or_m.output_1m if or_m else None)
    source = "openrouter" if or_m and input_1m is not None else "unknown"
    if input_1m is None and aa_m:
        input_1m, output_1m, source = aa_m.input_1m, aa_m.output_1m, "artificial_analysis"

    cache_read = or_m.cache_read_1m if or_m else None
    cache_write = or_m.cache_write_1m if or_m else None
    estimated = False
    if cache_read is None:
        creator = (or_m.creator if or_m else None) or (aa_m.creator_slug if aa_m else None)
        cache_read, cache_write = estimate_cache(creator, input_1m)
        estimated = cache_read is not None

    return Pricing(
        input_1m=input_1m,
        output_1m=output_1m,
        blended_1m=aa_m.blended_1m if aa_m else None,
        cache_read_1m=cache_read,
        cache_write_1m=cache_write,
        cache_estimated=estimated,
        source=source,
    )


def _added_at(or_m: ORModel | None) -> str | None:
    """OpenRouter `created` is a unix timestamp of when OR listed the model."""
    if not or_m or not or_m.created_unix:
        return None
    from datetime import datetime, timezone
    try:
        return datetime.fromtimestamp(or_m.created_unix, tz=timezone.utc).date().isoformat()
    except (OSError, OverflowError, ValueError):
        return None


def _build_model(or_m: ORModel | None, aa_m: AAModel | None) -> Model:
    sources = []
    if or_m:
        sources.append("openrouter")
    if aa_m:
        sources.append("artificial_analysis")

    if or_m:
        mid = or_m.id
        name = or_m.name
        creator = or_m.creator
        ctx = or_m.context_length
    else:
        creator_slug = norm_creator(aa_m.creator_slug or aa_m.creator_name) or "unknown"
        mid = f"{creator_slug}/{aa_m.slug or aa_m.id}"
        name = aa_m.name
        creator = aa_m.creator_slug or aa_m.creator_name
        ctx = None

    evals = Evaluations()
    perf = Performance()
    if aa_m:
        evals = Evaluations(
            intelligence=aa_m.intelligence,
            coding=aa_m.coding,
            math=aa_m.math,
            gpqa=aa_m.gpqa,
            hle=aa_m.hle,
            livecodebench=aa_m.livecodebench,
            mmlu_pro=aa_m.mmlu_pro,
            scicode=aa_m.scicode,
            math_500=aa_m.math_500,
            aime=aa_m.aime,
            aime_25=aa_m.aime_25,
            ifbench=aa_m.ifbench,
            tau2=aa_m.tau2,
            terminalbench_hard=aa_m.terminalbench_hard,
            lcr=aa_m.lcr,
        )
        perf = Performance(
            output_tokens_per_second=aa_m.output_tps,
            time_to_first_token_s=aa_m.ttft_s,
            time_to_first_answer_s=aa_m.ttfat_s,
        )

    return Model(
        id=mid,
        name=name,
        creator=creator,
        description=or_m.description if or_m else None,
        release_date=aa_m.release_date if aa_m else None,
        added_at=_added_at(or_m),
        knowledge_cutoff=or_m.knowledge_cutoff if or_m else None,
        context_length=ctx,
        max_output_tokens=or_m.max_output_tokens if or_m else None,
        modality=or_m.modality if or_m else None,
        input_modalities=or_m.input_modalities if or_m else [],
        output_modalities=or_m.output_modalities if or_m else [],
        tokenizer=or_m.tokenizer if or_m else None,
        supported_parameters=or_m.supported_parameters if or_m else [],
        evaluations=evals,
        pricing=_build_pricing(or_m, aa_m),
        performance=perf,
        sources=sources,
        openrouter_id=or_m.id if or_m else None,
        aa_slug=aa_m.slug if aa_m else None,
    )


@dataclass
class JoinResult:
    models: list[Model]
    matched: int
    openrouter_only: int
    aa_only: int


def _dedup_by_id(models: list[Model]) -> list[Model]:
    """Collapse models that share a canonical id.

    An AA-only effort variant can synthesize the same `creator/slug` as a real
    OpenRouter model (e.g. an unmatched "DeepSeek V4 Flash (Non-reasoning)").
    Keep the most complete entry: prefer one backed by OpenRouter (routable,
    has real pricing), then the one with more sources.
    """
    by_id: dict[str, Model] = {}
    for m in models:
        ex = by_id.get(m.id)
        if ex is None:
            by_id[m.id] = m
            continue
        m_or = "openrouter" in m.sources
        ex_or = "openrouter" in ex.sources
        if m_or and not ex_or:
            by_id[m.id] = m
        elif m_or == ex_or and len(m.sources) > len(ex.sources):
            by_id[m.id] = m
    return list(by_id.values())


def join(or_models: list[ORModel], aa_models: list[AAModel]) -> JoinResult:
    or_models = dedup_openrouter(or_models)
    aa_index = _index_aa(aa_models)
    matched_aa_ids: set[str] = set()

    models: list[Model] = []
    for or_m in or_models:
        aa_match, _ = _best_aa_match(or_m, aa_index)
        if aa_match is not None:
            matched_aa_ids.add(aa_match.id)
        models.append(_build_model(or_m, aa_match))

    # AA models that never matched an OpenRouter entry
    for a in aa_models:
        if a.id not in matched_aa_ids:
            models.append(_build_model(None, a))

    models = _dedup_by_id(models)

    # recompute counts from the final, de-duplicated list
    matched = sum(1 for m in models if len(m.sources) == 2)
    or_only = sum(1 for m in models if m.sources == ["openrouter"])
    aa_only = sum(1 for m in models if m.sources == ["artificial_analysis"])

    return JoinResult(
        models=models,
        matched=matched,
        openrouter_only=or_only,
        aa_only=aa_only,
    )
