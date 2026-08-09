# TestPlan — Models Monitor

| Campo | Valor |
|---|---|
| Created | 2026-08-06 |
| Last review | 2026-08-09 |
| Version | 1.1 |
| Status | Active |

## Objetivo e riscos

O serviço não pode atribuir benchmark de um modelo ao modelo errado, calcular
recomendação/tier incorretos, nem publicar um frontend inválido. Dados e
segredos de fontes externas não entram em testes: as verificações automáticas
usam fixtures sintéticas e `USE_FIXTURES=true`.

## Níveis e casos-sentinela

| ID | Risco/comportamento | Nível | Evidência |
|---|---|---|---|
| S-01 | Matching não cruza variantes/tier de modelos distintos | Unit (pytest) | testes em `backend/tests/test_join.py` |
| S-02 | Score, custo por perfil e tier mantêm ranking determinístico | Unit (pytest) | testes em `backend/tests/test_score.py` |
| S-03 | TypeScript, imports e bundle do dashboard são válidos | Static/build | `npm run lint && npm run build` |
| S-04 | Credencial não é adicionada a arquivo comittable | Static | `python3 tools/check_secrets.py` |
| S-05 | Meta nunca declara `live` para combinações de fontes mistas | Unit (pytest) | quatro cenários em `backend/tests/test_store.py` |
| S-06 | Falha de warm-up é observável sem vazar texto sensível | Unit (pytest) | `backend/tests/test_main.py` |
| S-07 | Tabela vazia distingue filtro de falha de carga e oferece recuperação | Build + ensaio manual | lint/build e Journal de 2026-08-09 |
| S-08 | Zoom do mapa altera domínio e Reset o restaura | Ensaio headless | Journal de 2026-08-09: botão, `Ctrl/⌘ + roda` e Reset |

## Gate local e CI

- Local: `make check`.
- CI: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), após
  instalar as dependências fixadas, executa o mesmo comando.
- O gate não faz chamadas de rede às fontes de modelos nem inicia processos.

## Limites atuais

Não há suíte de navegador/E2E nem integração live no gate porque dependeriam de
dados mutáveis e possivelmente pagos. Fluxos visuais críticos usam ensaio
headless documentado; antes de mudar o contrato HTTP, a lógica de refresh ou
outro fluxo visual crítico, acrescente a verificação proporcional e a evidência.
