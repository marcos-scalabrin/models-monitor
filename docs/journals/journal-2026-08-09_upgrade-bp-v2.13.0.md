# Journal — upgrade da baseline BP para v2.13.0

| Campo | Valor |
|---|---|
| Data | 2026-08-09 |
| Status | Encerramento local concluído — aguarda autorização de push |
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

## Revisão independente — rodada 1

**Veredito: insatisfatório para `7bab43818276db8d860da20f3887536a6d032e13`.**
O checador confirmou que o alvo permaneceu imutável e que o delta não tocou
produto, API, portas ou infraestrutura. Contudo, encontrou que
`9e2ba10ec8002e9c6ad1ee96d61ae8dba99377de` é o objeto de tag anotada
`v2.13.0`, enquanto o commit da release é
`8a8d704bb80f95aa742f4b9dcd6ec18a33b10a05`. A orientação de adoção exige o
SHA do commit correspondente; corrigir o lock e os entrypoints é necessário.

O `make check` do checador não chegou ao fim porque a worktree isolada não
tinha `frontend/node_modules` (`eslint: not found`). Isso não contradiz o gate
verde já executado no checkout preparado, mas a nova rodada usará as
dependências já existentes ou as instalará na árvore do checador antes de
concluir. O comentário completo, prompt e saídas estão no Plane em MODELS-11.

## Correção e revisão independente — rodada 2

O commit corretivo `dd76c5343129c1bba079d22be0c1115e16e74394` substituiu o
objeto de tag pelo commit de release `8a8d704bb80f95aa742f4b9dcd6ec18a33b10a05`
no lock e nos dois entrypoints. A nova worktree de checagem, preparada com
dependências Node locais sem alterar o alvo Git, reconfirmou o SHA no início e
no fim e emitiu **veredito satisfatório**.

Evidências da rodada 2: `make check` passou (scan de segredos OK; `21 passed`;
ESLint e build Vite OK); `git diff --check` passou; a comparação
`v2.13.0^{}` devolveu o mesmo SHA fixado. O aviso de bundle Vite de 571,04 kB
permanece não bloqueante e é acompanhado por MODELS-10. O prompt, os comandos,
as saídas, o modelo/papel (`GPT-5.6-terra`, checador independente) e o
veredito estão no comentário da rodada 2 em MODELS-11.

## Handoff

O upgrade está validado localmente. Os commits locais ainda aguardam autorização
explícita para `git push origin main`; até então o work item não será movido
para `Done`, pois o remoto não recebeu o estado validado.

## Encerramento da sessão (§3.2)

**Alcance do veredito.** O SHA
`e958349ea978ba8056154bbc60f6906d60a0b78a` foi validado independentemente na
rodada 3. Esta seção registra o encerramento depois dessa validação e será
commitada como delta documental; não amplia o alvo já revisado.

| Item | Veredito | Evidência | Justificativa (se não cumprido) |
|---|---|---|---|
| 1. Trabalho e validação | cumprido para `e958349` | MODELS-11 contém prompt pré-disparo e três rodadas; rodadas 2 e 3 satisfatórias para `dd76c53` e `e958349`; `make check` com scan OK, 21 testes, lint e build | — |
| 2. Journal | cumprido | este Journal, aberto antes da edição e com plano, decisões, verificações, reprovação/correção e handoff | — |
| 3. Commits e merge | cumprido localmente | `session-close` listou `7bab438`, `dd76c53`, `e958349`; `git status` limpo em `main`; não há branch de feature a mesclar | o commit deste registro é delta documental posterior ao SHA validado |
| 4. Sincronização com remoto | pendente | `session-close`: `origin` configurado e 3 commits locais ainda não empurrados | push exige autorização explícita do dono; o item MODELS-11 permanece em execução até então |
| 5. Worktrees | cumprido | `git worktree list --porcelain` mostrou apenas a worktree principal; as três árvores temporárias de checagem foram removidas | — |
| 6. Processos e recursos | cumprido | `ss -ltnp '( sport = :5173 or sport = :8890 )'` sem listeners; inspeção manual de CWD mostrou somente a árvore de processos do Codex, não serviço Models Monitor | o script não verificou por índice ausente, compensado pela inspeção manual e pelas portas efetivas |
| 7. Loop da baseline | cumprido | MODELS-11 registrou a correção de pin e seus vereditos; MODELS-12 rastreia o dado ignorado; nenhuma nova lacuna da baseline foi observada nesta sessão | — |

O aviso de bundle Vite permanece em MODELS-10. Nenhum serviço do Models Monitor
foi deixado escutando em `5173` ou `8890`.
