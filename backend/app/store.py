"""In-memory store: fetches sources, joins, caches with a TTL."""

from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

from .config import settings
from .join import JoinResult, join
from .schemas import MetaInfo, Model
from .sources import artificial_analysis as aa
from .sources import openrouter as orr

_DATA_DIR = Path(__file__).parent / "data"


class ModelStore:
    def __init__(self) -> None:
        self._models: list[Model] = []
        self._join: JoinResult | None = None
        self._last_updated: float | None = None
        self._source_mode: str = "fixtures"
        self._aa_available: bool = False
        self._lock = asyncio.Lock()

    # --- source loading ----------------------------------------------------

    def _load_or_fixture(self) -> list[dict]:
        return json.loads((_DATA_DIR / "openrouter_fixture.json").read_text())["data"]

    def _load_aa_fixture(self) -> list[dict]:
        return json.loads((_DATA_DIR / "aa_fixture.json").read_text())["data"]

    async def _load_sources(self) -> tuple[list, list, str, bool]:
        """Return (or_models, aa_models, source_mode, aa_available)."""
        if settings.use_fixtures:
            return (
                orr.parse(self._load_or_fixture()),
                aa.parse(self._load_aa_fixture()),
                "fixtures",
                True,
            )

        source_mode = "live"
        aa_available = False
        async with httpx.AsyncClient() as client:
            # OpenRouter (public)
            try:
                or_raw = await orr.fetch_raw(client)
                or_models = orr.parse(or_raw)
            except Exception:
                or_models = orr.parse(self._load_or_fixture())
                source_mode = "fixtures"

            # Artificial Analysis (needs key)
            aa_models: list = []
            if settings.aa_api_key:
                try:
                    aa_raw = await aa.fetch_raw(client)
                    aa_models = aa.parse(aa_raw)
                    aa_available = True
                except Exception:
                    aa_models = aa.parse(self._load_aa_fixture())
            else:
                aa_models = aa.parse(self._load_aa_fixture())

        return or_models, aa_models, source_mode, aa_available

    # --- public API --------------------------------------------------------

    async def refresh(self) -> None:
        async with self._lock:
            or_models, aa_models, mode, aa_available = await self._load_sources()
            result = join(or_models, aa_models)
            self._join = result
            self._models = result.models
            self._last_updated = time.time()
            self._source_mode = mode
            self._aa_available = aa_available

    def _is_stale(self) -> bool:
        if self._last_updated is None:
            return True
        return (time.time() - self._last_updated) > settings.cache_ttl_seconds

    async def get_models(self) -> list[Model]:
        if self._is_stale():
            await self.refresh()
        return self._models

    async def meta(self) -> MetaInfo:
        if self._is_stale():
            await self.refresh()
        j = self._join
        return MetaInfo(
            total_models=len(self._models),
            matched_models=j.matched if j else 0,
            openrouter_only=j.openrouter_only if j else 0,
            aa_only=j.aa_only if j else 0,
            last_updated=(
                datetime.fromtimestamp(self._last_updated, tz=timezone.utc).isoformat()
                if self._last_updated
                else None
            ),
            source_mode=self._source_mode,
            aa_available=self._aa_available,
        )


store = ModelStore()
