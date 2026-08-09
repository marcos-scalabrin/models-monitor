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
from .schemas import MetaInfo, Model, SourceInfo
from .sources import artificial_analysis as aa
from .sources import openrouter as orr

_DATA_DIR = Path(__file__).parent / "data"


class ModelStore:
    def __init__(self) -> None:
        self._models: list[Model] = []
        self._join: JoinResult | None = None
        self._last_updated: float | None = None
        self._source_mode: str = "fixtures"
        self._source_modes: dict[str, str] = {
            "openrouter": "fixtures",
            "artificial_analysis": "fixtures",
        }
        self._source_updated_at: dict[str, float | None] = {
            "openrouter": None,
            "artificial_analysis": None,
        }
        self._aa_available: bool = False
        self._lock = asyncio.Lock()

    # --- source loading ----------------------------------------------------

    def _load_or_fixture(self) -> list[dict]:
        return json.loads((_DATA_DIR / "openrouter_fixture.json").read_text())["data"]

    def _load_aa_fixture(self) -> list[dict]:
        return json.loads((_DATA_DIR / "aa_fixture.json").read_text())["data"]

    async def _load_sources(self) -> tuple[list, list, dict[str, str], bool]:
        """Return parsed data, per-source modes, and AA live availability."""
        if settings.use_fixtures:
            return (
                orr.parse(self._load_or_fixture()),
                aa.parse(self._load_aa_fixture()),
                {"openrouter": "fixtures", "artificial_analysis": "fixtures"},
                True,
            )

        source_modes = {"openrouter": "live", "artificial_analysis": "fixtures"}
        aa_available = False
        async with httpx.AsyncClient() as client:
            # OpenRouter (public)
            try:
                or_raw = await orr.fetch_raw(client)
                or_models = orr.parse(or_raw)
            except Exception:
                or_models = orr.parse(self._load_or_fixture())
                source_modes["openrouter"] = "fixtures"

            # Artificial Analysis (needs key)
            aa_models: list = []
            if settings.aa_api_key:
                try:
                    aa_raw = await aa.fetch_raw(client)
                    aa_models = aa.parse(aa_raw)
                    aa_available = True
                    source_modes["artificial_analysis"] = "live"
                except Exception:
                    aa_models = aa.parse(self._load_aa_fixture())
            else:
                aa_models = aa.parse(self._load_aa_fixture())

        return or_models, aa_models, source_modes, aa_available

    # --- public API --------------------------------------------------------

    async def refresh(self) -> None:
        async with self._lock:
            or_models, aa_models, source_modes, aa_available = await self._load_sources()
            result = join(or_models, aa_models)
            updated_at = time.time()
            self._join = result
            self._models = result.models
            self._last_updated = updated_at
            self._source_modes = source_modes
            self._source_updated_at = {source: updated_at for source in source_modes}
            modes = set(source_modes.values())
            self._source_mode = "live" if modes == {"live"} else "fixtures" if modes == {"fixtures"} else "mixed"
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
            sources={
                source: SourceInfo(
                    mode=mode,
                    last_updated=(
                        datetime.fromtimestamp(updated_at, tz=timezone.utc).isoformat()
                        if updated_at
                        else None
                    ),
                )
                for source, mode in self._source_modes.items()
                for updated_at in [self._source_updated_at.get(source)]
            },
            aa_available=self._aa_available,
        )


store = ModelStore()
