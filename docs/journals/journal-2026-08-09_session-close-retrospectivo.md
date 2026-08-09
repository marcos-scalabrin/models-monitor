# Journal — encerramento retrospectivo da sessão Models Monitor

| Campo | Valor |
|---|---|
| Data | 2026-08-09 |
| Status | Em fechamento |
| Baseline | `bp-best-practices` v2.7.0, commit `125a1c459a8e30fefdf8151a167c870f8f3954ca` |
| Caráter | **Retrospectivo, autorizado explicitamente pelo dono** |
| Limite | Este arquivo não substitui o Journal aberto antes do trabalho; documenta o estado e as decisões já tomadas para que o handoff não dependa de chat. |

## Plano retrospectivamente reconstruído

O plano não foi registrado na abertura. A reconstrução abaixo serve apenas para
explicar o delta entregue e é marcada como retrospectiva:

1. Adotar a baseline v2.7.0 de forma rastreável e alinhar o gate local/CI.
2. Auditar P1/P2/P5/P9, registrar os achados no Plane e implementar os itens
   autorizados (warm-up, estado vazio, proveniência de fontes e zoom do mapa).
3. Diagnosticar a baixa contagem visual de modelos e operar a instância live.
4. Validar o delta e encerrar a sessão com evidências honestas.

## Decisões e entregas

| Decisão | Por quê | Alternativas consideradas | Produzido |
|---|---|---|---|
| Fixar a baseline v2.7.0 | Tornar a adoção auditável e manter o gate proporcional | Copiar instruções sem lock; descartado por não deixar proveniência | `bp-lock.yaml`, `AGENTS.md`, `Makefile`, CI e documentação operacional |
| Expor `mixed` e proveniência por fonte | OpenRouter live podia mascarar benchmark AA de fixture | Manter só `source_mode`; descartado por permitir estado enganoso | Q-01 concluída; `MetaInfo.sources` e testes de quatro cenários |
| Operar em live para diagnosticar a contagem | Fixtures têm 34 modelos, mas a origem efetiva tem centenas | Assumir que o catálogo estava incompleto; descartado sem leitura das fontes | 734 registros unidos: 232 matched, 100 só OR, 402 só AA |
| Adicionar zoom centrado e resetável | O scatter plot live tem agrupamentos densos | Alterar a escala ou filtrar dados; descartado por ocultar informação | Zoom `+`/`−`/Reset e `Ctrl/⌘ + roda`, issue MODELS concluída |
| Registrar a lacuna do ciclo de sessão | A adoção posterior deixou esta sessão sem worktree/Journal de abertura | Silenciar a lacuna no fechamento; descartado | Issue BP `82d571cb-e1d6-4b3f-bee8-6e8c6c7951d0` |

## Rastreio operacional

- Goal MODELS concluído: `37dd8ac2-db62-497b-95ae-815f5f78c2dc`.
- Q-01, U-01, E-01 e zoom foram concluídas no Plane com evidências de
  validação. C-01 (proteção de refresh live) permanece aberto por exigir uma
  decisão de contrato/acesso.
- A issue de melhoria da baseline criada neste fechamento é
  `82d571cb-e1d6-4b3f-bee8-6e8c6c7951d0`.
- O aviso de bundle do gate foi registrado como `3d027b7d-e2a7-4829-b0ee-db816393a2f2`
  no módulo MODELS do projeto INFRA.

## Verificações

- `make check` em 2026-08-09: scan de segredos OK; `21 passed`; ESLint e
  TypeScript/Vite build OK. O Vite advertiu bundle de 571 kB, sem falhar o
  gate.
- `git diff --check`: OK antes do fechamento.
- Ensaios realizados anteriormente: API live com 734 modelos; interação
  headless confirmou zoom por botão e roda, e Reset restaurou o domínio.

## Revisão independente retrospectiva

**Proposição revisada.** A adoção rastreável da BP v2.7.0, o gate local/CI,
Q-01, U-01, E-01 e o zoom do mapa atendem aos critérios descritos nos work
items e no TestPlan.

**Veredito.** Satisfatório com ressalvas. O revisor independente executou
`git diff --check` e `make check` sem editar arquivos; confirmou a cobertura
dos quatro cenários de proveniência, o log seguro do warm-up, o estado vazio e
os controles de zoom.

**Ressalvas absorvidas.** O TestPlan agora relaciona Q-01/E-01/U-01/zoom às
respectivas evidências; `MetaInfo.sources` passou a ter schema explícito; e a
documentação esclarece que o timestamp por fonte representa carga no cache,
não atualização no provedor. Permanecem rastreados C-01 e o aviso não bloqueante
do bundle Vite.

## Pendências e riscos para a próxima sessão

- C-01 continua aberto: definir a fronteira de confiança de `POST /api/refresh`
  antes de acrescentar autenticação/coalescência/rate limit.
- O Journal foi autorizado em retrospectiva. Próximas sessões devem abrir
  worktree e Journal antes de editar; a issue BP acima rastreia melhoria desse
  caminho de adoção.
- O relatório de encerramento, commit, push e resultado da revisão independente
  serão acrescidos abaixo antes do fechamento final.
