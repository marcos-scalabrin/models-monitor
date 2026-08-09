import pytest

from app.config import settings
from app.sources import artificial_analysis as aa
from app.sources import openrouter as orr
from app.store import ModelStore


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("use_fixtures", "or_fails", "aa_fails", "expected_mode", "or_mode", "aa_mode"),
    [
        (True, False, False, "fixtures", "fixtures", "fixtures"),
        (False, False, False, "live", "live", "live"),
        (False, True, False, "mixed", "fixtures", "live"),
        (False, False, True, "mixed", "live", "fixtures"),
    ],
)
async def test_meta_reports_provenance_for_live_and_fixture_combinations(
    monkeypatch,
    use_fixtures,
    or_fails,
    aa_fails,
    expected_mode,
    or_mode,
    aa_mode,
):
    async def fetch_or(_client):
        if or_fails:
            raise RuntimeError("OpenRouter unavailable")
        return []

    async def fetch_aa(_client):
        if aa_fails:
            raise RuntimeError("Artificial Analysis unavailable")
        return []

    monkeypatch.setattr(settings, "use_fixtures", use_fixtures)
    monkeypatch.setattr(settings, "aa_api_key", "test-key")
    monkeypatch.setattr(orr, "fetch_raw", fetch_or)
    monkeypatch.setattr(aa, "fetch_raw", fetch_aa)

    store = ModelStore()
    await store.refresh()
    meta = await store.meta()

    assert meta.source_mode == expected_mode
    assert meta.sources.openrouter.mode == or_mode
    assert meta.sources.artificial_analysis.mode == aa_mode
    assert meta.sources.openrouter.last_updated is not None
    assert meta.sources.artificial_analysis.last_updated is not None
