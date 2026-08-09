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
