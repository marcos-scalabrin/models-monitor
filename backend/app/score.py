"""Compute value_ratio per agent profile and classify models into tiers."""

from __future__ import annotations

from .config import settings
from .profiles import PROFILES, Profile
from .schemas import Model, ScoredModel

DEFAULT_ALPHA = 0.5  # cost sensitivity: 0 ignores cost, 1 linear, 0.5 sqrt


def _benchmark_value(model: Model, profile: Profile) -> float | None:
    return getattr(model.evaluations, profile.primary_benchmark, None)


def score_model(model: Model, profile: Profile, alpha: float) -> ScoredModel:
    bench = _benchmark_value(model, profile)
    cost = profile.cost_fn(model.pricing)

    value_ratio = None
    if bench is not None and cost is not None and cost > 0:
        value_ratio = round(bench / (cost ** alpha), 4)

    return ScoredModel(
        **model.model_dump(),
        profile=profile.key,
        benchmark_score=bench,
        cost_for_profile=round(cost, 4) if cost is not None else None,
        value_ratio=value_ratio,
    )


def score_models(
    models: list[Model], profile: Profile, alpha: float = DEFAULT_ALPHA
) -> list[ScoredModel]:
    scored = [score_model(m, profile, alpha) for m in models]
    for sm in scored:
        sm.costs_by_profile = {
            k: (round(c, 4) if (c := p.cost_fn(sm.pricing)) is not None else None)
            for k, p in PROFILES.items()
        }
    _assign_tiers(scored)
    return scored


def _percentile(sorted_vals: list[float], q: float) -> float:
    """q in [0,1]; sorted_vals ascending. Linear interpolation."""
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    pos = q * (len(sorted_vals) - 1)
    lo = int(pos)
    hi = min(lo + 1, len(sorted_vals) - 1)
    frac = pos - lo
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * frac


def _assign_tiers(scored: list[ScoredModel]) -> None:
    """Mutates ScoredModel.tier in place.

    F  filtered (no benchmark / cost missing / outside thresholds)
    S  frontier — top 3 intelligence overall (among non-F)
    A  top 20% value_ratio for this profile
    B  middle band (40th-80th percentile)
    C  bottom band (below 40th percentile)
    """
    max_in = settings.max_input_cost_per_1m
    min_intel = settings.min_intelligence_score

    eligible: list[ScoredModel] = []
    for m in scored:
        bad = (
            m.value_ratio is None
            or m.benchmark_score is None
            or (m.pricing.input_1m is not None and m.pricing.input_1m > max_in)
            or (m.evaluations.intelligence is not None and m.evaluations.intelligence < min_intel)
        )
        if bad:
            m.tier = "F"
        else:
            eligible.append(m)

    if not eligible:
        return

    # S: top 3 by overall intelligence
    by_intel = sorted(
        eligible,
        key=lambda m: (m.evaluations.intelligence or -1),
        reverse=True,
    )
    s_ids = {id(m) for m in by_intel[:3] if (m.evaluations.intelligence or 0) > 0}
    for m in eligible:
        if id(m) in s_ids:
            m.tier = "S"

    rest = [m for m in eligible if m.tier != "S"]
    vrs = sorted(m.value_ratio for m in rest)  # type: ignore[misc]
    p80 = _percentile(vrs, 0.80)
    p40 = _percentile(vrs, 0.40)
    for m in rest:
        vr = m.value_ratio  # type: ignore[assignment]
        if vr >= p80:
            m.tier = "A"
        elif vr >= p40:
            m.tier = "B"
        else:
            m.tier = "C"
