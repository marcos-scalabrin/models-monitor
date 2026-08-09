# Journal — auditoria P1, P2, P5 e P9

| Campo | Valor |
|---|---|
| Author | Codex — personas P1, P2, P5 e P9 |
| Created | 2026-08-06 |
| Status | Complete |
| Base Git | `a1f193d9e758209a792638c6984bf7b24ccf0610` |
| Alvo auditado | Base acima mais o diff local não commitado listado no preflight |
| Eixos cobertos | P1 (engenharia), P2 (UX), P5 (custo), P9 (qualidade de dados) |
| Eixos fora do escopo | P3, P4, P6, P7, P8 e P10 |

## Plano

1. Fixar preflight: estado Git, processos, portas e fronteira de segurança.
2. P1: executar o gate, revisar fronteiras HTTP e checar segredos versionados.
3. P2: subir apenas a instância local com fixtures, percorrer endpoints e
   verificar os estados de espera/erro/vazio implementados no dashboard.
4. P5: mapear chamadas externas, custos e controles contra refresh repetido.
5. P9: confrontar metadados, recomendações e invariantes com as fixtures.
6. Consolidar observações factuais, achados, limites e evidências. Não corrigir
   nenhum achado durante esta auditoria.

## Fronteira de autonomia

- A instância de avaliação usará `USE_FIXTURES=true` e `NO_BROWSER=1`; não
  consultará Artificial Analysis ou OpenRouter e não chamará `POST /api/refresh`.
- Não serão lidos valores de `backend/.env`, expostos segredos, alterados
  contratos, portas, deploy ou infraestrutura.
- Não serão feitas correções, commits, pushes ou ações externas; qualquer
  achado que demande isso será apenas registrado com critério de aceite.

## Preflight

- `git log -1`: `a1f193d9e758209a792638c6984bf7b24ccf0610` em 2026-06-30.
- `git status --short`: **não limpo** por mudanças locais não commitadas de
  baseline, gate, documentação e tipagem do frontend; elas fazem parte do alvo
  atual e impedem alegar uma auditoria de commit imutável.
- `./service.sh status`: backend e frontend parados.
- `ss -ltnp`: sem listeners em `8890` ou `5173`; há processos de outros
  projetos, que não serão tocados.

## Decisões durante a auditoria

| Decisão | Por quê | Alternativas consideradas | Produzido |
|---|---|---|---|
| Auditar o diff local junto com `HEAD` | O checkout não estava limpo e o diff é o estado que será entregue | Resetar, criar worktree ou auditar apenas `HEAD`; todos ocultariam ou descartariam trabalho local | Cabeçalho com a identificação exata do alvo |
| Usar fixtures e instância local | Exercita API/UI sem gastar créditos nem ler credenciais | Dados live; rejeitado por ser desnecessário e exigir autorização | Screenshots e chamadas HTTP locais |
| Não chamar `POST /api/refresh` | A rota tem efeito externo em modo live | Testá-la contra providers; rejeitado pela fronteira de autonomia | Análise estática e achado P5 |

## Sumário de achados

| ID | Persona | Severidade | Achado |
|---|---|---|---|
| E-01 | P1 | Baixa | Falha inesperada no warm-up é descartada sem log |
| U-01 | P2 | Baixa | Busca/filtro sem resultado não tem estado vazio explícito |
| C-01 | P5 | Média (alta se exposto) | Refresh live não tem autenticação, rate limit, orçamento ou coalescência |
| Q-01 | P9 | Média | Metadado único de modo de fonte pode declarar `live` para dados mistos/live+fixture |

## P1 — engenharia

### Verificações

- `make check`: passou. Saída real: scan de segredos OK; `16 passed` no pytest;
  ESLint OK; TypeScript/Vite build OK. O Vite apenas advertiu bundle de 568 kB,
  que não é falha deste eixo.
- `git ls-files | rg -i '(credential|secret|token|...)'`: não retornou arquivo
  versionado sensível. `.gitignore` cobre `.env`, logs e runtime `.run/`.
- O OpenAPI em execução declarou oito leituras e uma escrita: `POST /api/refresh`.
  Perfil inválido retornou `404` com mensagem determinística; recomendação com
  piso impossível (`min_intelligence=100`) retornou `200` e coleção vazia.

### E-01 — warm-up engole falha inesperada

**Observado.** `backend/app/main.py:16-22` chama `store.refresh()` e executa
`except Exception: pass`. Não há log, métrica nem estado de erro para uma falha
fora dos fallbacks já tratados em `store.py`.

**Por que importa.** Uma fixture corrompida, erro de join ou regressão pode deixar
o serviço de pé, mas sem explicar por que o primeiro consumidor falhou. Isto é
diagnóstico degradado, não evidência de indisponibilidade observada nesta rodada.

**Ação proposta.** Registrar a exceção de warm-up com contexto seguro e cobrir
falha inesperada em teste; aceite: erro pesquisável sem segredo e health/meta
continuam com semântica documentada. Registrado em `BACKLOG.md`.

## P2 — UX de produto

### Verificações

- Instância descartável: `NO_BROWSER=1 USE_FIXTURES=true ./service.sh start`;
  backend `127.0.0.1:8890` e Vite `:5173` iniciaram. Nenhum provider externo foi
  chamado.
- Percurso HTTP: `/`, `/api/health`, `/api/meta`, `/api/profiles`, `/api/models`
  e `/api/recommend` retornaram `200` entre 1 e 7 ms; frontend retornou `200` em
  84 ms.
- Navegador headless local (1440×1000) mostrou o mapa, 34 modelos, filtros,
  recomendação e identificação visível de `fixtures`.
- Com somente o backend de avaliação parado, o navegador mostrou banner
  `Erro: Error: /models -> 502 — o backend está rodando em :8890?`; o backend
  foi reiniciado com fixtures após o ensaio.

### U-01 — tabela sem estado vazio explícito

**Observado.** `frontend/src/components/ModelTable.tsx:122-138` renderiza apenas
`rows.map(...)`; não há linha/CTA quando `rows` é vazio. No ensaio de falha, a
tabela exibiu o cabeçalho e `Modelos (0)`, sem explicar o estado. O banner de
erro funciona, mas busca/filtro que não retorna modelos produz a mesma área vazia.

**Por que importa.** Um usuário não sabe se deve limpar busca/filtro, esperar ou
investigar falha. A contagem ajuda, mas não instrui uma próxima ação.

**Ação proposta.** Incluir estado vazio distinguindo filtro/busca de erro de carga,
com ação para limpar filtros; aceite: busca sem correspondência exibe mensagem e
ação acessível. Registrado em `BACKLOG.md`.

## P5 — custo / FinOps

### Verificações

- `backend/app/store.py:49-72` confirma que o modo live consulta OpenRouter e,
  se houver chave, Artificial Analysis; ambos têm timeout de 30 s.
- OpenAPI e `backend/app/routes.py:163-165` confirmam que `POST /api/refresh`
  chama `store.refresh()` sem dependência de autenticação.
- Busca por `rate limit`, `budget`, `quota` e `cost_usd` não encontrou controle
  no código. O lock em `store.py:76-84` serializa chamadas, mas não evita que
  várias requisições explícitas façam vários refreshes sequenciais.

### C-01 — refresh sem controle técnico de consumo

**Observado.** Qualquer cliente com alcance de rede à API pode chamar
`POST /api/refresh`; em modo live isso inicia nova leitura dos provedores. Não há
autenticação, rate limit, orçamento, deduplicação por janela ou log de custo.

**Por que importa.** CORS limita navegadores, não clientes HTTP. A atual instância
de desenvolvimento faz bind local, mas o contrato da rota não contém essa defesa;
exposição futura transforma repetição de refresh em consumo de quota/créditos.

**Ação proposta.** Primeiro decidir se refresh é administrativo/local ou parte da
API de agentes. Depois adicionar autorização e coalescência/limite compatíveis;
aceite: clientes não autorizados não disparam fetch live e refreshes concorrentes
não multiplicam chamadas. A mudança de contrato/infra requer confirmação do dono.
Registrado em `BACKLOG.md`.

## P9 — qualidade e proveniência dos dados

### Verificações

- Fixtures em execução: `total_models=34`, `matched_models=21`,
  `openrouter_only=11`, `aa_only=2`; a soma confere 34.
- Todos os sete perfis retornaram 34 modelos. As recomendações com piso 48
  retornaram primary + 10 fallbacks e todos tiveram Intelligence ≥ 48.
- Para orquestrador: 23 pontos do cost-map tinham benchmark e custo; tiers
  continham 34 IDs únicos; a lista de modelos também tinha IDs únicos. Dos 34,
  11 não tinham benchmark e estavam em tier F.

### Q-01 — `source_mode` perde proveniência mista

**Observado.** Em `backend/app/store.py:49-72`, `source_mode` começa como `live`
e muda para `fixtures` somente se OpenRouter falhar (`:53-58`). Quando Artificial
Analysis não tem chave (`:69-70`) ou falha (`:62-68`), seus benchmarks vêm da
fixture, mas `source_mode` continua `live` se OpenRouter funcionou. `meta()`
expõe somente esse modo único em `:100-111`; o frontend o apresenta como selo.

**Por que importa.** O consumidor pode interpretar benchmarks de fixture como
atualizados/live e tomar decisão de roteamento com proveniência incompleta. Isto
é dedução direta do fluxo de fallback; não foi provocado com chamadas live.

**Ação proposta.** Expor modo e timestamp por fonte (ou estado `mixed`) e cobrir
os quatro cenários live/fallback; aceite: UI/API jamais exibem `live` quando uma
fonte usada no score é fixture. Registrado em `BACKLOG.md`.

## Limites desta auditoria

- O alvo inclui mudanças não commitadas; há commit base, mas não SHA imutável
  exclusivo do estado auditado.
- Não houve dados live, refresh POST, carga concorrente, gasto real, CI remoto,
  teste E2E interativo de filtros/drawer, teste mobile nem avaliação de
  acessibilidade (P6 fora do escopo).
- P3/P4/P6/P7/P8/P10 não foram auditadas. P9 validou invariantes das fixtures e
  proveniência de código; não mede correção dos benchmarks contra fontes live.
- Não foi feita correção durante a auditoria.

## Rastreio posterior

Em 2026-08-07, os quatro achados foram criados e vinculados ao módulo `MODELS`
do projeto `INFRA` no Plane (`tp_ai`):

| Achado | Work item Plane |
|---|---|
| Q-01 | `d6a98c9b-abf5-4d52-9cae-4d3437b78759` |
| C-01 | `08fa8c76-d46f-4670-ab9c-200aee2f4c36` |
| U-01 | `31a762b6-1d61-4f89-9799-8b982a20f806` |
| E-01 | `573b2c4c-b498-4d55-a54f-2b1e470d9e42` |

Em 2026-08-07, U-01, E-01 e Q-01 foram implementados e marcados como
concluídos no Plane. Q-01 recebeu confirmação explícita para o contrato público:
`source_mode` passou a aceitar `mixed` e `/api/meta`/`POST /api/refresh` passaram
a expor modo e timestamp de cada fonte. A execução local live confirmou 400
modelos na fonte OpenRouter e 734 registros no resultado unido (232 matched, 100
somente OpenRouter e 402 somente Artificial Analysis). C-01 segue aberto por
exigir decisão sobre o contrato e a proteção de refresh.
