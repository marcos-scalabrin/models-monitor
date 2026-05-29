"""FastAPI entrypoint for the Models Monitor / Hermes Model Router."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import router
from .store import store


@asynccontextmanager
async def lifespan(app: FastAPI):
    # warm the cache on startup; ignore failures (routes will lazy-load)
    try:
        await store.refresh()
    except Exception:
        pass
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
