# Backlog

Itens conhecidos pra fazer no projeto. Ordenados por valor / urgência. Riscado
quando entregue.

## Em aberto

- **Fallback de descrição.** Quando o OpenRouter devolve uma descrição
  curtíssima (caso `openai/o1-pro` com 188 chars), enriquecer com outra fonte
  (Artificial Analysis tem `description` em alguns modelos; idealmente também
  buscar na página oficial do provider). Hoje o detalhe do modelo mostra só o
  que o OR manda.

## Entregue

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
