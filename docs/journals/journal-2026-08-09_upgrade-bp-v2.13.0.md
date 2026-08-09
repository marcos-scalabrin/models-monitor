# Journal — upgrade da baseline BP para v2.13.0

| Campo | Valor |
|---|---|
| Data | 2026-08-09 |
| Status | Em andamento |
| Baseline de abertura | `bp-best-practices` v2.7.0, commit `125a1c459a8e30fefdf8151a167c870f8f3954ca` |
| Work item | Plane INFRA / MODELS, `MODELS-11` — Ops: atualizar baseline BP para v2.13.0 |

## Plano

1. Comparar a baseline pinada v2.7.0 com a tag estável v2.13.0 e classificar
   cada mudança pelo impacto local.
2. Atualizar o lock e as instruções de agentes para as obrigações novas que se
   aplicam ao serviço: checagem independente, evidência ancorada, alvo
   imutável, ciclo de sessão e estado durável.
3. Examinar os dados ignorados pelo Git sem abrir ou publicar conteúdo
   sensível; registrar qualquer ativo potencialmente único que não tenha prova
   de espelho.
4. Rodar `make check`, revisar o delta em commit imutável e registrar o
   veredito independente no work item.

## Fronteira de autonomia

Posso alterar documentação, lock da baseline, instruções de agentes e controles
locais proporcionais. Não alterarei API pública, portas, deploy,
infraestrutura, chamadas live ou cópias externas de dados. Em particular, uma
eventual cópia da planilha ignorada para backup depende de autorização explícita
do dono, pois é uma ação externa e pode transportar dados desconhecidos.

## Decisões

| Decisão | Por quê | Alternativas consideradas | Produzido |
|---|---|---|---|
| Adotar v2.13.0 em vez de copiar partes soltas | A tag e o SHA tornam a evolução auditável e o minor é compatível | Permanecer em v2.7.0; descartado pois perderia controles já aplicáveis | `bp-lock.yaml`, `AGENTS.md`, `CLAUDE.md` |
| Registrar a planilha legada como desvio temporário | Não é possível inferir origem ou backup sem tocar no conteúdo | Declarar como reprodutível; descartado por não existir script comprovado | ADR de retenção, RunGuide e MODELS-12 |
| Não instalar infraestrutura de backup ou migrações | O serviço não persiste estado; criar controles sem ativo seria teatro operacional | Introduzir banco/backup preventivamente; descartado por expandir produto sem necessidade | Classificação explícita no RunGuide |

## Verificações executadas

- `make check`: scan de segredos OK; backend com `21 passed`; ESLint e build
  TypeScript/Vite OK. O Vite manteve o aviso não bloqueante do bundle inicial
  acima de 500 kB, já rastreado em MODELS-10.
- `git diff --check`: OK.
- Inspeção de estado: não há código de banco, migrations ou persistência;
  `backend/app/store.py` declara store em memória. A planilha ignorada foi
  identificada por caminho/tamanho/listagem de arquivo, sem abrir o conteúdo.

## Pendências

- MODELS-12 deve identificar dono/origem da planilha e encerrar o desvio com
  regeneração comprovada ou espelho e restore real datado.
- A próxima seção registrará o SHA imutável e o veredito independente.
