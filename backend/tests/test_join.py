"""Tests for the AA <-> OpenRouter join — the highest-risk piece."""

from app.join import dedup_openrouter, join, norm_creator
from app.sources.artificial_analysis import AAModel
from app.sources.openrouter import ORModel


def _or(id, name, creator, inp=1.0, out=4.0, ctx=128000):
    return ORModel(
        id=id, canonical_slug=id, name=name, creator=creator,
        context_length=ctx, input_1m=inp, output_1m=out,
    )


def _aa(slug, name, creator, intel=60.0):
    return AAModel(
        id=f"aa-{slug}", name=name, slug=slug,
        creator_name=creator, creator_slug=creator, intelligence=intel,
        coding=intel - 2, math=intel + 2, input_1m=1.0, output_1m=4.0,
    )


def test_norm_creator_aliases():
    assert norm_creator("meta-llama") == "meta"
    assert norm_creator("x-ai") == "xai"
    assert norm_creator("Anthropic") == "anthropic"
    assert norm_creator("mistralai") == "mistral"


def test_match_across_naming_differences():
    # OR uses dotted version, AA uses dashed slug + reordered name
    or_models = [_or("anthropic/claude-opus-4.7", "Anthropic: Claude Opus 4.7", "anthropic")]
    aa_models = [_aa("claude-opus-4-7", "Claude Opus 4.7", "anthropic", intel=78.0)]
    result = join(or_models, aa_models)
    assert result.matched == 1
    m = result.models[0]
    assert m.evaluations.intelligence == 78.0
    assert set(m.sources) == {"openrouter", "artificial_analysis"}


def test_creator_mismatch_prevents_false_match():
    or_models = [_or("openai/gpt-5.5", "OpenAI: GPT-5.5", "openai")]
    # same-ish tokens but wrong creator -> must NOT match
    aa_models = [_aa("gpt-5-5", "GPT-5.5", "google")]
    result = join(or_models, aa_models)
    assert result.matched == 0
    assert result.openrouter_only == 1
    assert result.aa_only == 1


def test_unmatched_aa_model_is_kept():
    or_models = [_or("anthropic/claude-opus-4.7", "Claude Opus 4.7", "anthropic")]
    aa_models = [
        _aa("claude-opus-4-7", "Claude Opus 4.7", "anthropic"),
        _aa("some-private-model", "Private Model X", "acme"),
    ]
    result = join(or_models, aa_models)
    assert result.aa_only == 1
    ids = {m.id for m in result.models}
    assert "acme/some-private-model" in ids


def test_dedup_prefers_base_over_variant():
    models = [
        _or("deepseek/deepseek-v4:free", "DeepSeek V4 (free)", "deepseek"),
        _or("deepseek/deepseek-v4", "DeepSeek V4", "deepseek"),
    ]
    deduped = dedup_openrouter(models)
    assert len(deduped) == 1
    assert deduped[0].id == "deepseek/deepseek-v4"


def test_matches_through_creator_and_date_noise():
    # OR name leaks creator ("Anthropic:") and slug carries a date suffix;
    # both must be stripped so the model still matches its AA entry.
    or_models = [
        ORModel(
            id="anthropic/claude-opus-4.7",
            canonical_slug="anthropic/claude-opus-4.7-20260101",
            name="Anthropic: Claude Opus 4.7",
            creator="anthropic",
            context_length=200000,
            input_1m=5.0,
            output_1m=25.0,
        )
    ]
    aa_models = [_aa("claude-opus-4-7", "Claude Opus 4.7 (Adaptive Reasoning, Max Effort)", "anthropic", intel=57.3)]
    result = join(or_models, aa_models)
    assert result.matched == 1
    assert result.models[0].evaluations.intelligence == 57.3


def test_effort_variant_tiebreak_prefers_highest_intelligence():
    # AA lists the same model under several reasoning-effort variants. The OR
    # model should bind to the highest-intelligence one, not "minimal"/"low".
    or_models = [_or("google/gemini-3.5-flash", "Google: Gemini 3.5 Flash", "google")]
    aa_models = [
        _aa("gemini-3-5-flash", "Gemini 3.5 Flash (minimal)", "google", intel=43.3),
        _aa("gemini-3-5-flash-high", "Gemini 3.5 Flash (high)", "google", intel=55.3),
    ]
    result = join(or_models, aa_models)
    assert result.matched == 1
    assert result.models[0].evaluations.intelligence == 55.3


def test_medium_is_kept_as_identity():
    # "medium" is a real model name (Mistral Medium), not an effort label.
    or_models = [
        _or("mistralai/mistral-medium-3-5", "Mistral: Mistral Medium 3.5", "mistralai"),
        _or("mistralai/mistral-small-3-5", "Mistral: Mistral Small 3.5", "mistralai"),
    ]
    aa_models = [_aa("mistral-medium-3-5", "Mistral Medium 3.5", "mistral", intel=39.2)]
    result = join(or_models, aa_models)
    # the AA medium model must bind to mistral-medium, not mistral-small
    medium = next(m for m in result.models if m.id == "mistralai/mistral-medium-3-5")
    small = next(m for m in result.models if m.id == "mistralai/mistral-small-3-5")
    assert medium.evaluations.intelligence == 39.2
    assert small.evaluations.intelligence is None


def test_tier_marker_prevents_base_binding_to_pro_variant():
    # Real case: AA has BOTH "MiMo-V2.5" (intel 49) and "MiMo-V2.5-Pro"
    # (intel 53.8). OR has both `mimo-v2.5` and `mimo-v2.5-pro`. The base
    # one must NOT inherit Pro's benchmarks just because Pro scores higher.
    or_models = [
        _or("xiaomi/mimo-v2.5", "MiMo-V2.5", "xiaomi"),
        _or("xiaomi/mimo-v2.5-pro", "MiMo-V2.5-Pro", "xiaomi"),
    ]
    aa_models = [
        _aa("mimo-v2-5-0424", "MiMo-V2.5", "xiaomi", intel=49.0),
        _aa("mimo-v2-5-pro", "MiMo-V2.5-Pro", "xiaomi", intel=53.8),
    ]
    result = join(or_models, aa_models)
    base = next(m for m in result.models if m.id == "xiaomi/mimo-v2.5")
    pro = next(m for m in result.models if m.id == "xiaomi/mimo-v2.5-pro")
    assert base.evaluations.intelligence == 49.0, "base wrongly bound to Pro"
    assert pro.evaluations.intelligence == 53.8


def test_no_duplicate_ids_when_aa_variant_collides_with_openrouter():
    # OR deepseek-v4-flash matches the "(Reasoning)" AA variant; the unmatched
    # "(Non-reasoning)" variant has slug deepseek-v4-flash and would synthesize
    # the SAME id deepseek/deepseek-v4-flash. The result must not duplicate it.
    or_models = [_or("deepseek/deepseek-v4-flash", "DeepSeek V4 Flash", "deepseek")]
    aa_models = [
        _aa("deepseek-v4-flash-reasoning", "DeepSeek V4 Flash (Reasoning)", "deepseek", intel=58.0),
        _aa("deepseek-v4-flash", "DeepSeek V4 Flash (Non-reasoning)", "deepseek", intel=50.0),
    ]
    result = join(or_models, aa_models)
    ids = [m.id for m in result.models]
    assert len(ids) == len(set(ids)), f"duplicate ids: {ids}"
    # the surviving deepseek-v4-flash must be the OpenRouter-backed one
    dsv4 = next(m for m in result.models if m.id == "deepseek/deepseek-v4-flash")
    assert "openrouter" in dsv4.sources


def test_openrouter_only_model_has_pricing_no_benchmark():
    or_models = [_or("meta-llama/llama-guard-4-12b", "Llama Guard 4", "meta-llama")]
    result = join(or_models, [])
    m = result.models[0]
    assert m.pricing.input_1m == 1.0
    assert m.evaluations.intelligence is None
    assert m.pricing.cache_estimated is True  # estimated from provider rules
