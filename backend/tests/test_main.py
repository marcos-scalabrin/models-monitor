import logging

import pytest

from app.main import app, lifespan, store


@pytest.mark.asyncio
async def test_lifespan_logs_warmup_failure_without_exception_text(monkeypatch, caplog):
    async def fail_refresh() -> None:
        raise RuntimeError("credential=must-not-be-logged")

    monkeypatch.setattr(store, "refresh", fail_refresh)

    with caplog.at_level(logging.WARNING, logger="app.main"):
        async with lifespan(app):
            pass

    assert "model-store warm-up failed (RuntimeError)" in caplog.text
    assert "credential=must-not-be-logged" not in caplog.text
