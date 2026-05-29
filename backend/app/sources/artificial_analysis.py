"""Fetch and parse Artificial Analysis LLM benchmark + pricing data."""

from __future__ import annotations

from dataclasses import dataclass, field

import httpx

from ..config import settings


@dataclass
class AAModel:
    id: str
    name: str
    slug: str
    creator_name: str | None
    creator_slug: str | None
    release_date: str | None = None       # ISO "YYYY-MM-DD"
    # composite indices (already 0-100)
    intelligence: float | None = None
    coding: float | None = None
    math: float | None = None
    # raw benchmarks (AA returns 0-1; parser scales to 0-100 for consistency)
    gpqa: float | None = None
    hle: float | None = None
    livecodebench: float | None = None
    mmlu_pro: float | None = None
    scicode: float | None = None
    math_500: float | None = None
    aime: float | None = None
    aime_25: float | None = None
    # orchestration / agentic benchmarks
    ifbench: float | None = None              # instruction-following
    tau2: float | None = None                  # tool-use agent benchmark
    terminalbench_hard: float | None = None    # terminal-bench (agentic)
    lcr: float | None = None                   # long-context reasoning
    # pricing already in USD per 1M tokens
    input_1m: float | None = None
    output_1m: float | None = None
    blended_1m: float | None = None
    # performance
    output_tps: float | None = None
    ttft_s: float | None = None
    ttfat_s: float | None = None              # time-to-first-answer (post-thinking)
    extras: dict = field(default_factory=dict)


def _num(v) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _pct(v) -> float | None:
    """AA returns raw benchmarks as fractions (0-1). Scale to percentage 0-100
    so they render consistently alongside the indices. If a value already looks
    like a percentage (> 1), leave it as-is."""
    n = _num(v)
    if n is None:
        return None
    return round(n * 100, 2) if n <= 1 else round(n, 2)


def parse(raw: list[dict]) -> list[AAModel]:
    out: list[AAModel] = []
    for m in raw:
        ev = m.get("evaluations") or {}
        pr = m.get("pricing") or {}
        creator = m.get("model_creator") or {}
        out.append(
            AAModel(
                id=str(m.get("id") or m.get("slug") or ""),
                name=m.get("name") or m.get("slug") or "",
                slug=str(m.get("slug") or ""),
                creator_name=creator.get("name"),
                creator_slug=creator.get("slug"),
                release_date=m.get("release_date"),
                intelligence=_num(ev.get("artificial_analysis_intelligence_index")),
                coding=_num(ev.get("artificial_analysis_coding_index")),
                math=_num(ev.get("artificial_analysis_math_index")),
                gpqa=_pct(ev.get("gpqa")),
                hle=_pct(ev.get("hle")),
                livecodebench=_pct(ev.get("livecodebench")),
                mmlu_pro=_pct(ev.get("mmlu_pro")),
                scicode=_pct(ev.get("scicode")),
                math_500=_pct(ev.get("math_500")),
                aime=_pct(ev.get("aime")),
                aime_25=_pct(ev.get("aime_25")),
                ifbench=_pct(ev.get("ifbench")),
                tau2=_pct(ev.get("tau2")),
                terminalbench_hard=_pct(ev.get("terminalbench_hard")),
                lcr=_pct(ev.get("lcr")),
                input_1m=_num(pr.get("price_1m_input_tokens")),
                output_1m=_num(pr.get("price_1m_output_tokens")),
                blended_1m=_num(pr.get("price_1m_blended_3_to_1")),
                output_tps=_num(m.get("median_output_tokens_per_second")),
                ttft_s=_num(m.get("median_time_to_first_token_seconds")),
                ttfat_s=_num(m.get("median_time_to_first_answer_token")),
            )
        )
    return out


async def fetch_raw(client: httpx.AsyncClient) -> list[dict]:
    """Requires AA_API_KEY. Raises if the key is missing or the call fails."""
    if not settings.aa_api_key:
        raise RuntimeError("AA_API_KEY not configured")
    resp = await client.get(
        f"{settings.aa_base_url}/data/llms/models",
        headers={"x-api-key": settings.aa_api_key},
        timeout=settings.http_timeout_seconds,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", []) if isinstance(data, dict) else data
