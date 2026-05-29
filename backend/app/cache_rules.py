"""Provider cache-price estimation when explicit prices are unavailable.

Multipliers applied to the input price, per the hermes-model-router spec.
"""

from __future__ import annotations

# (read_multiplier, write_multiplier) relative to input price.
# write_multiplier None => provider handles caching automatically (no extra cost).
_RULES: dict[str, tuple[float, float | None]] = {
    "anthropic": (0.10, 1.25),
    "google": (0.25, 1.00),
    "openai": (0.50, None),
}
_DEFAULT = (0.10, 1.25)


def _provider_key(creator: str | None) -> str:
    c = (creator or "").lower()
    for key in _RULES:
        if key in c:
            return key
    # OpenRouter ids/creators sometimes differ; map a few aliases
    if "claude" in c:
        return "anthropic"
    if "gemini" in c or "gemma" in c:
        return "google"
    if "gpt" in c or "o1" in c or "o3" in c:
        return "openai"
    return "default"


def estimate_cache(
    creator: str | None,
    input_1m: float | None,
) -> tuple[float | None, float | None]:
    """Return (cache_read_1m, cache_write_1m) estimated from input price."""
    if input_1m is None:
        return None, None
    read_mult, write_mult = _RULES.get(_provider_key(creator), _DEFAULT)
    read = round(input_1m * read_mult, 6)
    write = round(input_1m * write_mult, 6) if write_mult is not None else 0.0
    return read, write
