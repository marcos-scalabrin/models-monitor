# Hermes Model Router
### Projeto: Mapa de Custo-Benefício para Configuração de Agentes e Fallbacks

> **Contexto:** ferramenta para times de engenharia decidirem, de forma sistemática e reproduzível, qual modelo LLM colocar em cada agente (e qual usar como fallback) com base em benchmarks objetivos cruzados com custo real de inferência.

---

## 1. Problema

Configurar modelos em agentes hoje é empírico e manual. Não há critério claro que responda:

- Para este agente (pesquisa, código, orquestração, análise), qual modelo entrega o maior resultado pelo menor custo?
- Se o modelo primário falhar ou estiver caro demais, qual é o fallback ideal — e quando acionar?
- A diferença de inteligência entre modelo A e B justifica 10× mais custo de input?
- Cache compensa para o padrão de uso deste agente específico?

---

## 2. Objetivo

Produzir um **pipeline automatizado** que:

1. Coleta dados de benchmark (Artificial Analysis) e preços reais (OpenRouter)
2. Cruza as duas fontes por modelo
3. Gera um mapa visual interativo (Plotly) de custo × performance
4. Exporta uma **tabela de decisão** com tiers de modelo por perfil de agente
5. Produz um **config YAML/JSON** pronto para importar no Hermes Agent

---

## 3. Fontes de Dados

### 3.1 Artificial Analysis API
- **Endpoint:** `GET https://artificialanalysis.ai/api/v2/data/llms/models`
- **Auth:** header `x-api-key: $AA_API_KEY`
- **Campos relevantes por modelo:**

| Campo | Descrição |
|---|---|
| `evaluations.artificial_analysis_intelligence_index` | Score 0–100 de inteligência geral |
| `evaluations.artificial_analysis_coding_index` | Score 0–100 de coding |
| `evaluations.artificial_analysis_math_index` | Score 0–100 de raciocínio matemático |
| `evaluations.gpqa` | GPQA Diamond (ciência/raciocínio avançado) |
| `evaluations.hle` | Humanity's Last Exam (dificuldade extrema) |
| `evaluations.livecodebench` | Coding contaminação-free |
| `pricing.price_1m_input_tokens` | USD por 1M tokens de input |
| `pricing.price_1m_output_tokens` | USD por 1M tokens de output |
| `median_output_tokens_per_second` | Throughput (velocidade de resposta) |

### 3.2 OpenRouter API
- **Endpoint:** `GET https://openrouter.ai/api/v1/models`
- **Auth:** público (sem key) ou Bearer token para contexto de usuário
- **Campos relevantes:**

| Campo | Descrição |
|---|---|
| `pricing.prompt` | USD/token de input |
| `pricing.completion` | USD/token de output |
| `pricing.input_cache_read` | USD/token de cache read (explicit caching) |
| `pricing.input_cache_write` | USD/token de cache write |
| `context_length` | Janela de contexto máxima |
| `supported_parameters` | tool_calls, structured_output, etc. |

### 3.3 Regras de Cache por Provider
Quando o OpenRouter não retorna preços explícitos de cache:

| Provider | Cache Read | Cache Write |
|---|---|---|
| Anthropic | 0.10× input | 1.25× input |
| Google | 0.25× input | 1.00× input |
| OpenAI | 0.50× input | automático |
| Outros | 0.10× input (estimativa) | 1.25× input (estimativa) |

---

## 4. Perfis de Agente (Hermes)

Cada agente tem um perfil de uso que determina qual dimensão de benchmark é mais relevante e qual padrão de tokens esperar.

### 4.1 Tabela de Perfis

| Perfil | Benchmark Primário | Benchmark Secundário | Padrão de Token | Cache? |
|---|---|---|---|---|
| **Orquestrador** | Intelligence | — | Muitos inputs, pouco output | ✅ alto (system prompt fixo) |
| **Pesquisa / RAG** | Intelligence | — | Input pesado (contexto longo) | ✅ muito alto |
| **Coding** | Coding | Intelligence | Output pesado (gera código) | ⚠️ médio |
| **Análise de Dados** | Math | Coding | Balanceado | ⚠️ médio |
| **Redação / Conteúdo** | Intelligence | — | Output pesado | ❌ baixo |
| **Tool Use / Agentic** | Intelligence | Coding | Muitas chamadas curtas | ✅ alto (tools fixas) |
| **Suporte / Chat** | Intelligence | — | Curto e frequente | ❌ baixo |

### 4.2 Hermes Agents Mapeados

```
Hermes Agent
├── Orquestrador (routing, planning)
├── Research Agent (web search, RAG)
├── Code Agent (geração, debug, refactor)
├── Data Agent (análise, SQL, planilhas)
├── Writing Agent (conteúdo, redação)
└── Tool Agent (automações, APIs externas)
```

---

## 5. Lógica de Custo-Benefício

### 5.1 Score de Valor (Value Ratio)

Para cada perfil, calcular:

```
value_ratio = benchmark_score / cost_function(perfil)^alpha
```

Onde `cost_function` varia por perfil:

```python
# Orquestrador / RAG → custo de input domina
cost = input_cost + 0.1 * output_cost + 0.05 * cache_read

# Coding / Writing → output domina
cost = 0.3 * input_cost + output_cost

# Agentic / Tool Use → muitas chamadas, cache importa muito
cost = input_cost + output_cost - savings_from_cache

# Balanceado (default)
cost = 0.5 * input_cost + 0.5 * output_cost
```

`alpha` controla sensibilidade ao custo: `0.5` = raiz quadrada (default), `1.0` = linear, `0` = ignora custo.

### 5.2 Tiers de Modelo

A partir do value_ratio, classificar em tiers:

| Tier | Critério | Papel no Hermes |
|---|---|---|
| **S — Frontier** | Top 3 Intelligence geral | Tarefas críticas, sem fallback |
| **A — High Value** | Top 20% value_ratio por perfil | Primário para maioria dos agentes |
| **B — Balanced** | Mediana do value_ratio | Fallback de primeiro nível |
| **C — Economy** | Bottom 30% custo, aceite de benchmark | Fallback de segundo nível / volume |
| **F — Filtrado** | Sem benchmark ou custo > threshold | Excluído |

---

## 6. Estrutura do Projeto

```
hermes-model-router/
├── README.md                    ← este arquivo
├── .env.example
│
├── src/
│   ├── fetch/
│   │   ├── openrouter.py        ← GET /api/v1/models + parse pricing
│   │   └── artificialanalysis.py← GET /api/v2/data/llms/models + parse
│   │
│   ├── join.py                  ← merge OR + AA por slug/nome
│   ├── score.py                 ← value_ratio por perfil de agente
│   ├── tiers.py                 ← classifica modelos em S/A/B/C/F
│   │
│   ├── viz/
│   │   ├── cost_map.py          ← gráfico Plotly (4 sub-plots)
│   │   └── tier_table.py        ← tabela HTML interativa por perfil
│   │
│   └── export/
│       ├── yaml_config.py       ← gera hermes_models.yaml
│       └── json_config.py       ← gera hermes_models.json
│
├── output/
│   ├── benchmark_cost_map.html  ← gráfico interativo
│   ├── tier_table.html          ← tabela de decisão
│   ├── hermes_models.yaml       ← config pronto para Hermes
│   └── hermes_models.json
│
├── benchmark_cost_map.py        ← script único (versão compacta)
└── requirements.txt
```

---

## 7. Output: Config do Hermes Agent

### 7.1 Formato YAML (`hermes_models.yaml`)

```yaml
# Gerado automaticamente por hermes-model-router
# Atualizado em: {data}

agents:

  orchestrator:
    profile: orchestrator
    primary:
      model: "anthropic/claude-sonnet-4-6"
      reason: "Melhor value_ratio Intelligence/input_cost para contextos longos"
    fallbacks:
      - model: "google/gemini-2-5-flash"
        trigger: "latency > 5s OR cost_per_call > $0.05"
        reason: "Tier A, 10× mais barato, 88% da inteligência"
      - model: "deepseek/deepseek-v4-flash"
        trigger: "gemini unavailable OR cost_per_call > $0.02"
        reason: "Tier B, economia máxima"
    cache:
      enabled: true
      min_tokens: 1024
      strategy: "system_prompt"   # fixar system_prompt no cache

  research:
    profile: rag
    primary:
      model: "google/gemini-2-5-pro"
      reason: "Maior context window (2M), melhor para RAG pesado"
    fallbacks:
      - model: "anthropic/claude-sonnet-4-6"
        trigger: "context_length < 200k OR gemini_error"
      - model: "qwen/qwen-3-6-plus"
        trigger: "cost_ceiling_reached"
    cache:
      enabled: true
      min_tokens: 4096
      strategy: "document_prefix"  # cachear documentos de referência

  coding:
    profile: coding
    primary:
      model: "anthropic/claude-opus-4-6"
      reason: "Maior Coding Index, melhor para agentic coding multi-step"
    fallbacks:
      - model: "deepseek/deepseek-v4-flash"
        trigger: "task_complexity < 'hard' OR cost_ceiling_reached"
        reason: "Coding Index competitivo, 50× mais barato"
      - model: "google/gemini-2-5-flash"
        trigger: "deepseek_error"
    cache:
      enabled: false  # output-heavy, cache não compensa

  data:
    profile: data_analysis
    primary:
      model: "google/gemini-2-5-pro"
      reason: "Melhor Math Index + context longo para datasets"
    fallbacks:
      - model: "anthropic/claude-sonnet-4-6"
        trigger: "google_error"
      - model: "deepseek/deepseek-v4-flash"
        trigger: "cost_ceiling_reached"
    cache:
      enabled: true
      strategy: "schema_prefix"   # cachear schema do banco/tabela

  writing:
    profile: content
    primary:
      model: "anthropic/claude-sonnet-4-6"
      reason: "Melhor qualidade de linguagem, value_ratio alto para output"
    fallbacks:
      - model: "google/gemini-2-5-flash"
        trigger: "volume_mode OR cost_per_call > $0.03"
      - model: "meta-llama/llama-4-maverick"
        trigger: "economy_mode"
    cache:
      enabled: false

  tool_agent:
    profile: agentic
    primary:
      model: "anthropic/claude-sonnet-4-6"
      reason: "Melhor tool-use reliability + cache de tools fixas"
    fallbacks:
      - model: "google/gemini-2-5-flash"
        trigger: "latency > 3s OR cost_ceiling_reached"
      - model: "qwen/qwen-3-6-plus"
        trigger: "economy_mode"
    cache:
      enabled: true
      strategy: "tools_prefix"    # cachear definições de tools

# Thresholds globais de fallback
fallback_policy:
  triggers:
    - type: "latency"
      threshold_seconds: 8
    - type: "error_rate"
      threshold_percent: 5
      window_minutes: 5
    - type: "cost_per_call"
      threshold_usd: 0.10
    - type: "provider_down"
      action: "next_fallback"
  max_fallback_depth: 3
  alert_on_fallback: true
```

---

## 8. Roadmap de Desenvolvimento

### Fase 1 — Script Base ✅
- [x] Fetch OpenRouter pricing
- [x] Mock data AA (sem API key)
- [x] Join datasets
- [x] Gráfico Plotly 4-plots (dark theme)
- [x] Value ratio básico

### Fase 2 — Pipeline Completo
- [ ] Integrar AA API key real
- [ ] Parser de agentic benchmarks (GDPval-AA Elo, Terminal-Bench)
- [ ] Value ratio por perfil de agente (funções de custo diferenciadas)
- [ ] Tier classifier (S/A/B/C/F)
- [ ] Tabela HTML interativa por perfil

### Fase 3 — Config Export
- [ ] Gerador de `hermes_models.yaml`
- [ ] Gerador de `hermes_models.json`
- [ ] CLI: `python main.py --profile coding --top 3`

### Fase 4 — Automação
- [ ] Cron semanal (benchmarks mudam)
- [ ] Diff automático: "Modelo X subiu de tier B → A"
- [ ] Webhook para atualizar config do Hermes sem restart
- [ ] Dashboard web (Streamlit ou FastAPI + React)

---

## 9. Variáveis de Ambiente

```bash
# .env.example
AA_API_KEY=                    # Artificial Analysis (plano pago)
OPENROUTER_API_KEY=            # Opcional — enriquece dados de uso real

# Thresholds de filtro (opcionais)
MAX_INPUT_COST_PER_1M=50       # Excluir modelos > $50/M input
MIN_INTELLIGENCE_SCORE=30      # Excluir modelos < 30 pontos

# Perfil padrão para gráfico
DEFAULT_BENCHMARK=intelligence  # intelligence | coding | math
```

---

## 10. Dependências

```
# requirements.txt
requests>=2.31
pandas>=2.0
plotly>=5.18
python-dotenv>=1.0
pyyaml>=6.0
```

---

## 11. Referências

| Recurso | URL |
|---|---|
| Artificial Analysis API Docs | `artificialanalysis.ai/documentation` |
| AA Intelligence Index Methodology | `artificialanalysis.ai/methodology/intelligence-benchmarking` |
| AA Coding Agents Leaderboard | `artificialanalysis.ai/agents/coding-agents` |
| AA GDPval-AA (Agentic) | `artificialanalysis.ai/evaluations/gdpval-aa` |
| OpenRouter Models API | `openrouter.ai/docs/api/api-reference/models/get-models` |
| OpenRouter Prompt Caching | `openrouter.ai/docs/guides/best-practices/prompt-caching` |
| OpenRouter App Rankings | `openrouter.ai/apps` |
| Hermes Agent (Nous Research) | `openrouter.ai/apps/category/coding` |
| CodeSOTA (inverted OR view) | `codesota.com/agentic/openrouter-models` |

---

*Hermes Model Router v0.1 — spec de design*
