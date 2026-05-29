"""Public API routes — the surface agents (and the frontend) consume."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from .profiles import DEFAULT_PROFILE, PROFILES, get_profile, profile_info
from .schemas import (
    MetaInfo,
    Model,
    ProfileInfo,
    Recommendation,
    ScoredModel,
)
from .score import DEFAULT_ALPHA, score_models
from .store import store

router = APIRouter(prefix="/api")

_TIER_ORDER = {"S": 0, "A": 1, "B": 2, "C": 3, "F": 4}


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/meta", response_model=MetaInfo)
async def meta() -> MetaInfo:
    return await store.meta()


@router.get("/profiles", response_model=list[ProfileInfo])
async def list_profiles() -> list[ProfileInfo]:
    return [profile_info(p) for p in PROFILES.values()]


async def _scored_for(profile_key: str, alpha: float) -> list[ScoredModel]:
    try:
        profile = get_profile(profile_key)
    except KeyError:
        raise HTTPException(404, f"Unknown profile '{profile_key}'")
    models = await store.get_models()
    return score_models(models, profile, alpha)


@router.get("/models", response_model=list[ScoredModel])
async def list_models(
    profile: str = Query(DEFAULT_PROFILE),
    alpha: float = Query(DEFAULT_ALPHA, ge=0, le=2),
    tier: str | None = Query(None, description="Filter by tier S|A|B|C|F"),
    creator: str | None = None,
    source: str | None = Query(None, description="openrouter|artificial_analysis"),
    has_benchmark: bool | None = None,
    min_intelligence: float | None = None,
    max_input_cost: float | None = None,
    search: str | None = None,
    sort: str = Query("value_ratio", description="value_ratio|intelligence|cost|name"),
    limit: int = Query(500, ge=1, le=2000),
) -> list[ScoredModel]:
    items = await _scored_for(profile, alpha)

    if tier:
        tiers = {t.strip().upper() for t in tier.split(",")}
        items = [m for m in items if m.tier in tiers]
    if creator:
        items = [m for m in items if (m.creator or "").lower() == creator.lower()]
    if source:
        items = [m for m in items if source in m.sources]
    if has_benchmark is not None:
        items = [m for m in items if (m.benchmark_score is not None) == has_benchmark]
    if min_intelligence is not None:
        items = [m for m in items if (m.evaluations.intelligence or -1) >= min_intelligence]
    if max_input_cost is not None:
        items = [m for m in items if (m.pricing.input_1m or 1e9) <= max_input_cost]
    if search:
        q = search.lower()
        items = [m for m in items if q in m.name.lower() or q in m.id.lower()]

    items = _sort(items, sort)
    return items[:limit]


def _sort(items: list[ScoredModel], sort: str) -> list[ScoredModel]:
    if sort == "intelligence":
        return sorted(items, key=lambda m: (m.evaluations.intelligence or -1), reverse=True)
    if sort == "cost":
        return sorted(items, key=lambda m: (m.cost_for_profile if m.cost_for_profile is not None else 1e9))
    if sort == "name":
        return sorted(items, key=lambda m: m.name.lower())
    # default: value_ratio desc, None last
    return sorted(items, key=lambda m: (m.value_ratio is not None, m.value_ratio or 0), reverse=True)


@router.get("/cost-map", response_model=list[ScoredModel])
async def cost_map(
    profile: str = Query(DEFAULT_PROFILE),
    alpha: float = Query(DEFAULT_ALPHA, ge=0, le=2),
) -> list[ScoredModel]:
    """Plot-ready: only models that have both a benchmark score and a cost."""
    items = await _scored_for(profile, alpha)
    return [
        m for m in items
        if m.benchmark_score is not None and m.cost_for_profile is not None
    ]


@router.get("/tiers", response_model=dict[str, list[ScoredModel]])
async def tiers(
    profile: str = Query(DEFAULT_PROFILE),
    alpha: float = Query(DEFAULT_ALPHA, ge=0, le=2),
) -> dict[str, list[ScoredModel]]:
    items = await _scored_for(profile, alpha)
    grouped: dict[str, list[ScoredModel]] = {t: [] for t in _TIER_ORDER}
    for m in _sort(items, "value_ratio"):
        grouped.setdefault(m.tier or "F", []).append(m)
    return grouped


@router.get("/recommend", response_model=Recommendation)
async def recommend(
    profile: str = Query(DEFAULT_PROFILE),
    top: int = Query(3, ge=1, le=10, description="number of fallbacks to include"),
    alpha: float = Query(DEFAULT_ALPHA, ge=0, le=2),
) -> Recommendation:
    """Core agent-facing endpoint: best primary model + ranked fallbacks."""
    items = await _scored_for(profile, alpha)
    ranked = [m for m in _sort(items, "value_ratio") if m.value_ratio is not None]
    if not ranked:
        return Recommendation(profile=profile)

    # primary: best overall value among S/A tiers (frontier-capable), else best value
    preferred = [m for m in ranked if m.tier in ("S", "A")] or ranked
    primary = preferred[0]
    fallbacks = [m for m in ranked if m.id != primary.id][:top]
    return Recommendation(profile=profile, primary=primary, fallbacks=fallbacks)


@router.get("/models/{model_id:path}", response_model=ScoredModel)
async def get_model(
    model_id: str,
    profile: str = Query(DEFAULT_PROFILE),
    alpha: float = Query(DEFAULT_ALPHA, ge=0, le=2),
) -> ScoredModel:
    items = await _scored_for(profile, alpha)
    for m in items:
        if m.id == model_id:
            return m
    raise HTTPException(404, f"Model '{model_id}' not found")


@router.post("/refresh", response_model=MetaInfo)
async def refresh() -> MetaInfo:
    await store.refresh()
    return await store.meta()
