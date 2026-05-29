"""Tests for value_ratio scoring and tier assignment."""

from app.profiles import get_profile
from app.schemas import Evaluations, Model, Pricing
from app.score import score_models


def _model(id, intel, coding, inp, out, ctx=128000):
    return Model(
        id=id, name=id, creator=id.split("/")[0], context_length=ctx,
        evaluations=Evaluations(intelligence=intel, coding=coding, math=intel),
        pricing=Pricing(input_1m=inp, output_1m=out, source="openrouter"),
    )


def _models():
    return [
        _model("a/frontier-expensive", 80, 82, 30, 120),
        _model("b/high-value", 70, 72, 1.5, 6),
        _model("c/balanced", 60, 62, 0.5, 2),
        _model("d/cheap-weak", 45, 44, 0.1, 0.4),
        _model("e/mid", 55, 56, 0.3, 1.2),
    ]


def test_value_ratio_rewards_cheap_capable_models():
    profile = get_profile("orchestrator")
    scored = score_models(_models(), profile, alpha=0.5)
    by_id = {m.id: m for m in scored}
    # high-value (good intel, cheap) should beat frontier-expensive on value_ratio
    assert by_id["b/high-value"].value_ratio > by_id["a/frontier-expensive"].value_ratio


def test_frontier_models_get_s_tier():
    profile = get_profile("orchestrator")
    scored = score_models(_models(), profile, alpha=0.5)
    s_models = [m for m in scored if m.tier == "S"]
    # top 3 by intelligence -> 80, 70, 60
    assert {m.id for m in s_models} == {
        "a/frontier-expensive", "b/high-value", "c/balanced",
    }


def test_all_tiers_assigned():
    profile = get_profile("coding")
    scored = score_models(_models(), profile, alpha=0.5)
    assert all(m.tier in {"S", "A", "B", "C", "F"} for m in scored)


def test_model_without_benchmark_is_filtered():
    profile = get_profile("orchestrator")
    no_bench = Model(
        id="x/unknown", name="x", creator="x",
        pricing=Pricing(input_1m=1.0, output_1m=2.0),
    )
    scored = score_models([no_bench, *_models()], profile, alpha=0.5)
    x = next(m for m in scored if m.id == "x/unknown")
    assert x.tier == "F"
    assert x.value_ratio is None


def test_alpha_zero_ignores_cost():
    profile = get_profile("orchestrator")
    scored = score_models(_models(), profile, alpha=0.0)
    by_id = {m.id: m for m in scored}
    # with alpha=0, value_ratio == benchmark; frontier (80) > high-value (70)
    assert by_id["a/frontier-expensive"].value_ratio > by_id["b/high-value"].value_ratio
