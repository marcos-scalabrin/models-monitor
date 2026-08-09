# Journal — MODELS-14: busca compartilhada do mapa

| Campo | Valor |
|---|---|
| Data | 2026-08-09 |
| Work item | Plane INFRA / MODELS, `MODELS-14` — UX: aplicar busca de modelos ao gráfico custo × performance |
| Estado ao abrir | In Progress |
| Plano | Centralizar a busca textual no estado de filtros; aplicar ao conjunto que alimenta mapa e tabela; testar o comportamento e executar `make check`. |
| Gate | `make check` (fixtures, sem rede) e ensaio local proporcional do dashboard. |
| Fronteira de autonomia | Alterar somente o frontend/documentação/testes proporcionais. Não alterar API, fontes, refresh, portas, deploy ou infraestrutura; não chamar refresh live nem acessar a planilha XLSX ignorada. |

## Critérios de aceite

1. Buscar por trecho de nome ou ID, sem distinção entre maiúsculas/minúsculas,
   reduz os pontos do mapa aos modelos correspondentes.
2. A busca combina com os filtros existentes e limpar filtros restaura a visão.
3. `make check` passa em modo de fixtures.
4. A evidência de execução e o veredito independente ficam registrados no item
   Plane e neste Journal ao encerrar.

## Decisões iniciais

- A busca já existe localmente em `ModelTable`; ela será promovida ao estado
  compartilhado do dashboard para evitar resultados divergentes entre mapa e
  tabela.
- Não há sessão/agente concorrente neste checkout no início do trabalho;
  `git status --short` estava limpo e `git worktree list --porcelain` mostrou
  somente a árvore principal.

## Iteração após checagem independente

A primeira checagem independente do commit `321f9a6` foi **insatisfatória**:
o tier permanecia local à tabela, de modo que a limpeza global não o resetava.
Também ficou explícita a diferença estrutural entre a tabela (que mantém
modelos sem métrica) e o mapa (que só pode plotar modelos com benchmark e
custo).

O ajuste seguinte promove o tier ao estado compartilhado e torna visível no
título do mapa a contagem de pontos plotáveis, sem descartar linhas válidas da
tabela. O ensaio headless live, sem refresh, confirmou:

- busca exata por `inclusionai/ling-3.0-flash`: tabela `1` e mapa `1` ponto;
- seleção de tier reduziu a tabela para `3` linhas;
- `Limpar` restaurou a consulta vazia, `734` linhas e `616` pontos elegíveis.

## Encerramento (§3.2)

**Alcance do veredito.** O commit imutável
`e3d3d92b46e23b9ae1be15d9976858540c939839` contém a entrega de produto e foi
checado independentemente. Este apêndice é somente o registro posterior de
encerramento; não altera o comportamento verificado.

| Item | Veredito | Evidência executada | Pendência/justificativa |
|---|---|---|---|
| 1. Trabalho e validação | cumprido | `make check`: scan de segredos OK, 21 testes, ESLint e build; ensaio headless live: busca exata 1 linha/1 ponto, tier e Limpar restauraram 734 linhas/616 pontos | aviso Vite de bundle >500 kB, não bloqueante, já rastreado em MODELS-10 |
| 2. Journal | cumprido | este Journal foi aberto antes da primeira edição e registra plano, fronteira e as duas rodadas de checagem | — |
| 3. Commits e merge | cumprido localmente | candidato final `e3d3d92`; a rodada 1 `321f9a6` foi reprovada e sucedida pelo corretivo | este apêndice documental será commitado após o veredito e não integra o alvo checado |
| 4. Sincronização com remoto | pendente | não foi executado push nem CI remoto | push não foi autorizado pelo dono |
| 5. Worktrees | cumprido | worktree temporária `/tmp/models-monitor-check-321f9a6` usada pelo checador será removida após o registro | a árvore principal permaneceu em `main` e intacta |
| 6. Processos e recursos | cumprido | ensaios headless foram encerrados; `./service.sh status` mantém somente backend/frontend live solicitados pelo dono | o serviço live é mantido intencionalmente |
| 7. Loop da baseline | cumprido | a checagem adversarial encontrou e corrigiu a divergência de tier/limpeza; a ressalva ambiental foi eliminada com `npm ci` no worktree isolado e nova checagem satisfatória | nenhuma nova issue necessária; MODELS-10 continua para o aviso Vite |

### Veredito independente final

**Satisfatório.** Checador independente, no mesmo modelo do executor e no papel
de revisão, confirmou o SHA no início/fim, executou `npm ci` somente na árvore
isolada e obteve `make check` verde. Também confirmou que busca e tier são
centralizados, que `Limpar` retorna aos defaults e que a contagem de pontos
deixa explícita a elegibilidade do gráfico. A saída detalhada e o prompt
pré-disparo estão nos comentários da MODELS-14 no Plane.
