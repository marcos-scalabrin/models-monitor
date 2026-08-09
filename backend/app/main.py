"""FastAPI entrypoint for the Models Monitor / Hermes Model Router."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import router
from .store import store

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm the cache on startup. Routes can still lazily retry on failure.
    try:
        await store.refresh()
    except Exception as exc:
        # Do not serialize the exception: provider responses can contain
        # sensitive details. The type is enough to find and diagnose failures.
        logger.warning(
            "model-store warm-up failed (%s); routes will retry lazily",
            type(exc).__name__,
        )
    yield


app = FastAPI(
    title="Models Monitor — Hermes Model Router",
    description=(
        "Cost × performance map of LLMs for agent model selection. "
        "Cruza benchmarks da Artificial Analysis com preços do OpenRouter."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root() -> dict:
    return {"name": "models-monitor", "docs": "/docs", "api": "/api"}
