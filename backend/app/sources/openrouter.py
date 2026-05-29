"""Fetch and parse OpenRouter models (pricing, context, capabilities)."""

from __future__ import annotations

from dataclasses import dataclass, field

import httpx

from ..config import settings


@dataclass
class ORModel:
    id: str                          # "anthropic/claude-..."
    canonical_slug: str | None
    name: str
    creator: str | None
    context_length: int | None
    description: str | None = None
    created_unix: int | None = None  # when OR added the model
    knowledge_cutoff: str | None = None
    modality: str | None = None              # e.g. "text->text", "text+image->text"
    input_modalities: list[str] = field(default_factory=list)
    output_modalities: list[str] = field(default_factory=list)
    tokenizer: str | None = None
    max_output_tokens: int | None = None
    supported_parameters: list[str] = field(default_factory=list)
    # pricing converted to USD per 1M tokens
    input_1m: float | None = None
    output_1m: float | None = None
    cache_read_1m: float | None = None
    cache_write_1m: float | None = None


def _per_million(value: str | float | None) -> float | None:
    """OpenRouter prices are USD per token (as strings). Convert to per 1M."""
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return round(v * 1_000_000, 6)


def parse(raw: list[dict]) -> list[ORModel]:
    out: list[ORModel] = []
    for m in raw:
        mid = m.get("id") or ""
        creator = mid.split("/", 1)[0] if "/" in mid else None
        pricing = m.get("pricing") or {}
        arch = m.get("architecture") or {}
        top = m.get("top_provider") or {}
        out.append(
            ORModel(
                id=mid,
                canonical_slug=m.get("canonical_slug"),
                name=m.get("name") or mid,
                creator=creator,
                context_length=m.get("context_length"),
                description=m.get("description"),
                created_unix=m.get("created"),
                knowledge_cutoff=m.get("knowledge_cutoff"),
                modality=arch.get("modality"),
                input_modalities=arch.get("input_modalities") or [],
                output_modalities=arch.get("output_modalities") or [],
                tokenizer=arch.get("tokenizer"),
                max_output_tokens=top.get("max_completion_tokens"),
                supported_parameters=m.get("supported_parameters") or [],
                input_1m=_per_million(pricing.get("prompt")),
                output_1m=_per_million(pricing.get("completion")),
                cache_read_1m=_per_million(pricing.get("input_cache_read")),
                cache_write_1m=_per_million(pricing.get("input_cache_write")),
            )
        )
    return out


async def fetch_raw(client: httpx.AsyncClient) -> list[dict]:
    """Public endpoint; no key required."""
    headers = {}
    if settings.openrouter_api_key:
        headers["Authorization"] = f"Bearer {settings.openrouter_api_key}"
    resp = await client.get(
        f"{settings.openrouter_base_url}/models",
        headers=headers,
        timeout=settings.http_timeout_seconds,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", data) if isinstance(data, dict) else data
