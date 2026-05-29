"""Application settings, loaded from environment / .env."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Data sources ---
    aa_api_key: str | None = None
    openrouter_api_key: str | None = None  # optional, enriches usage context

    aa_base_url: str = "https://artificialanalysis.ai/api/v2"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # When True, never hit the network; serve bundled fixtures. Also used
    # automatically as a fallback when a live fetch fails.
    use_fixtures: bool = False

    # --- Filtering thresholds ---
    max_input_cost_per_1m: float = 100.0   # exclude models above this $/1M input
    min_intelligence_score: float = 0.0    # exclude models below this AA intelligence

    # --- Cache / refresh ---
    cache_ttl_seconds: int = 6 * 60 * 60   # how long joined data stays fresh
    http_timeout_seconds: float = 30.0

    # --- CORS ---
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


settings = Settings()
