"""Agent profiles and their cost functions (from hermes-model-router spec).

Each profile maps an agent's usage pattern to:
  - which benchmark dimension matters most (primary_benchmark)
  - how to weight input/output/cache cost into a single $/1M figure
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from .schemas import Pricing, ProfileInfo


@dataclass(frozen=True)
class Profile:
    key: str
    label: str
    primary_benchmark: str            # attribute name on Evaluations
    secondary_benchmark: str | None
    token_pattern: str
    cache: str
    description: str
    cost_fn: Callable[[Pricing], float | None]
    cost_pattern: str                  # short label of the cost function family


def _g(p: Pricing, attr: str) -> float | None:
    return getattr(p, attr, None)


def _cost_input_heavy(p: Pricing) -> float | None:
    """Orchestrator / RAG: input dominates, cache reads matter."""
    i, o = p.input_1m, p.output_1m
    if i is None or o is None:
        return None
    cache = p.cache_read_1m if p.cache_read_1m is not None else 0.1 * i
    return i + 0.1 * o + 0.05 * cache


def _cost_output_heavy(p: Pricing) -> float | None:
    """Coding / Writing: output dominates."""
    i, o = p.input_1m, p.output_1m
    if i is None or o is None:
        return None
    return 0.3 * i + o


def _cost_agentic(p: Pricing) -> float | None:
    """Agentic / Tool use: many calls, cache savings are significant."""
    i, o = p.input_1m, p.output_1m
    if i is None or o is None:
        return None
    cache_read = p.cache_read_1m if p.cache_read_1m is not None else 0.1 * i
    # part of the input is served from cache on repeat calls -> savings
    savings = 0.5 * (i - cache_read)
    return max(i + o - savings, 0.01)


def _cost_balanced(p: Pricing) -> float | None:
    i, o = p.input_1m, p.output_1m
    if i is None or o is None:
        return None
    return 0.5 * i + 0.5 * o


PROFILES: dict[str, Profile] = {
    "orchestrator": Profile(
        key="orchestrator",
        label="Orquestrador",
        primary_benchmark="intelligence",
        secondary_benchmark=None,
        token_pattern="Muitos inputs, pouco output",
        cache="alto (system prompt fixo)",
        description="Routing e planejamento. Inteligência geral domina; custo de input pesa.",
        cost_fn=_cost_input_heavy,
        cost_pattern="input-pesado"
    ),
    "rag": Profile(
        key="rag",
        label="Pesquisa / RAG",
        primary_benchmark="intelligence",
        secondary_benchmark=None,
        token_pattern="Input pesado (contexto longo)",
        cache="muito alto",
        description="Web search e RAG. Contexto longo, cache de documentos compensa muito.",
        cost_fn=_cost_input_heavy,
        cost_pattern="input-pesado"
    ),
    "coding": Profile(
        key="coding",
        label="Coding",
        primary_benchmark="coding",
        secondary_benchmark="intelligence",
        token_pattern="Output pesado (gera código)",
        cache="médio",
        description="Geração, debug e refactor. Coding index domina; output pesa.",
        cost_fn=_cost_output_heavy,
        cost_pattern="output-pesado"
    ),
    "data_analysis": Profile(
        key="data_analysis",
        label="Análise de Dados",
        primary_benchmark="math",
        secondary_benchmark="coding",
        token_pattern="Balanceado",
        cache="médio",
        description="Análise, SQL e planilhas. Raciocínio matemático domina.",
        cost_fn=_cost_balanced,
        cost_pattern="balanceado"
    ),
    "content": Profile(
        key="content",
        label="Redação / Conteúdo",
        primary_benchmark="intelligence",
        secondary_benchmark=None,
        token_pattern="Output pesado",
        cache="baixo",
        description="Conteúdo e redação. Qualidade de linguagem; output domina, cache não compensa.",
        cost_fn=_cost_output_heavy,
        cost_pattern="output-pesado"
    ),
    "agentic": Profile(
        key="agentic",
        label="Tool Use / Agentic",
        primary_benchmark="intelligence",
        secondary_benchmark="coding",
        token_pattern="Muitas chamadas curtas",
        cache="alto (tools fixas)",
        description="Automações e APIs externas. Confiabilidade de tool-use; cache de tools pesa.",
        cost_fn=_cost_agentic,
        cost_pattern="agentic-cache"
    ),
    "support": Profile(
        key="support",
        label="Suporte / Chat",
        primary_benchmark="intelligence",
        secondary_benchmark=None,
        token_pattern="Curto e frequente",
        cache="baixo",
        description="Suporte e chat. Respostas curtas e frequentes; custo total importa.",
        cost_fn=_cost_balanced,
        cost_pattern="balanceado"
    ),
}

DEFAULT_PROFILE = "orchestrator"


def get_profile(key: str) -> Profile:
    if key not in PROFILES:
        raise KeyError(key)
    return PROFILES[key]


def profile_info(p: Profile) -> ProfileInfo:
    return ProfileInfo(
        key=p.key,
        label=p.label,
        primary_benchmark=p.primary_benchmark,
        secondary_benchmark=p.secondary_benchmark,
        token_pattern=p.token_pattern,
        cache=p.cache,
        description=p.description,
        cost_pattern=p.cost_pattern,
    )
