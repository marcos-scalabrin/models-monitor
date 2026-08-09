# Backlog

Espelho local dos itens conhecidos. A fonte de verdade operacional é o módulo
`MODELS` do projeto `INFRA` no Plane (`tp_ai`); atualize o espelho junto com o
work item correspondente. Itens ordenados por valor / urgência e riscados quando
entregue.

## Em aberto

- **[Auditoria P5] Controlar `/api/refresh` antes de expor a API.** A rota não
  exige autenticação e não tem rate limit, orçamento ou coalescência de refresh;
  em modo live cada chamada pode consultar provedores e consumir quota. Definir a
  fronteira de confiança e adicionar controle técnico compatível ao contrato.
  Plane: `08fa8c76-d46f-4670-ab9c-200aee2f4c36`.
- **Fallback de descrição.** Quando o OpenRouter devolve uma descrição
  curtíssima (caso `openai/o1-pro` com 188 chars), enriquecer com outra fonte
  (Artificial Analysis tem `description` em alguns modelos; idealmente também
  buscar na página oficial do provider). Hoje o detalhe do modelo mostra só o
  que o OR manda.
- **[Performance] Reduzir bundle inicial do dashboard.** O build atual passa,
  mas Vite alerta bundle JavaScript inicial de aproximadamente 571 kB. Medir e
  avaliar code splitting das visualizações pesadas. Plane:
  `3d027b7d-e2a7-4829-b0ee-db816393a2f2`.

## Entregue

- ✅ **[UX] Zoom in/out no mapa custo × performance.** Controles acessíveis de
  ampliar, reduzir e resetar; `Ctrl/⌘ + roda` cobre mouse/pinch sem capturar a
  rolagem comum. Plane: `b766a6ac-5f4b-4bce-ae76-0097939dfd4b`.
- ✅ **[Auditoria P9] Proveniência por fonte em dados live/fixture.**
  `source_mode` agora inclui `mixed`; a API traz modo e timestamp de cada fonte,
  com testes dos quatro cenários live/fallback. Plane:
  `d6a98c9b-abf5-4d52-9cae-4d3437b78759`.
- ✅ **[Auditoria P2] Estado vazio acionável na tabela.** Busca/filtros sem
  resultado explicam o estado e oferecem limpeza; falha de carga permanece
  distinguível. Plane: `31a762b6-1d61-4f89-9799-8b982a20f806`.
- ✅ **[Auditoria P1] Falha inesperada de warm-up registrada com segurança.** O
  tipo da exceção é logado sem serializar sua mensagem; há teste anti-vazamento.
  Plane: `573b2c4c-b498-4d55-a54f-2b1e470d9e42`.
- ✅ "casados" → "matched" no Header.
- ✅ `/recommend` com piso de capacidade (`min_intelligence`, default `48`) —
  primary e fallbacks têm que clearar o piso. Caller passa o valor por tarefa.
- ✅ Coluna **Comp.** com checkbox na tabela pra adicionar/remover modelos da
  comparação sem abrir o drawer.
- ✅ Custo por perfil de agente no detalhe e na tabela comparativa (mesmo
  pricing, funções de custo diferentes — mostra o que cada perfil "pagaria").
- ✅ Provider multi-select no FilterBar.
- ✅ ModelDetail enriquecido (description, release_date, modalidades, tokenizer,
  reasoning benchmarks, orquestração/tool-use benchmarks, copy do id).
- ✅ Tier marker no matcher — `pro`/`mini`/`nano`/`flash`/etc. são identidade,
  não ruído. Impede `xiaomi/mimo-v2.5` de herdar benchmarks de `mimo-v2.5-pro`.
- ✅ GitHub Actions: pytest (backend) + tsc/vite build (frontend) em push/PR.
- ✅ Badges + screenshot no README.
