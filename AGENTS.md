# Instruções para agentes

## Baseline e contexto

Este projeto adota `bp-best-practices` **v2.13.0**, fixada no commit
`9e2ba10ec8002e9c6ad1ee96d61ae8dba99377de`; a proveniência, os perfis ativos e
o desvio temporário de retenção de dados locais estão em
[`bp-lock.yaml`](bp-lock.yaml). Antes de editar, leia este arquivo,
o [README](README.md), o [TestPlan](docs/testplans/testplan-service.md) e os
documentos relevantes em `docs/`.

- Produto: API FastAPI que cruza dados de LLMs e dashboard React/Vite.
- Rastreio operacional: Plane, workspace `tp_ai`, projeto `INFRA`, módulo
  `MODELS` (IDs e perfil ativo em [`bp-lock.yaml`](bp-lock.yaml)). Antes de
  trabalho não trivial, localize/crie o work item, mova-o para execução e
  registre comandos, evidências e veredito de validação ao encerrá-lo.
- [`BACKLOG.md`](BACKLOG.md) é somente espelho local dos itens pendentes; o
  Plane é a fonte de verdade operacional.
- Verificação obrigatória: `make check`. O CI executa o mesmo gate.
- Não altere API pública, portas, deploy, infraestrutura ou comportamento do
  produto sem confirmação explícita do dono.

## Sessão, revisão e evidência

- Em trabalho autônomo não trivial, abra o Journal com o **Plano** antes de
  editar; confirme a issue no Plane, mova-a para `In Progress` e declare o
  gate, o escopo e a fronteira de autonomia. Ao encerrar, responda os sete
  itens de `core.md` §3.2 em tabela com evidência executada na hora.
- Se outra sessão/agente puder editar, use worktree dedicada e consulte a fila
  antes de começar. O isolamento de diretório não substitui a reivindicação da
  issue.
- `Done` exige checagem independente de um commit imutável. Antes de disparar
  o checador, registre no item o prompt/critério, o SHA e a postura adversarial;
  não faça commit nem push até receber o veredito. O checador trabalha em árvore
  própria, reconfirma o SHA ao fim e cita trechos de código/docs que sustentam
  cada proposição. Após a rodada, confira que a árvore do executor e o checkout
  principal continuam íntegros.
- O veredito é `satisfatório`, `satisfatório com ressalvas` ou
  `insatisfatório`. Ressalva só fecha com consequência inofensiva demonstrada e
  issue própria. Registre no `Done` o modelo/papel do checador; por default os
  subagentes herdam o modelo do executor, portanto checagem e execução nunca
  podem ser inferiores a ele.
- Ao criar teste para correção de defeito ou invariante não distinguível pelo
  caminho feliz, faça a prova de mutação sobre estado commitado: diff da
  mutação, teste vermelho pelo assert e restauração. Não trate teste verde como
  prova suficiente.

## Segurança e operações externas

- Segredos ficam somente em `backend/.env` ou no ambiente; nunca os imprima,
  cole em documentação, fixtures, logs ou commits. Atualize apenas arquivos
  `.env.example` com valores vazios ou marcadores seguros.
- Use `USE_FIXTURES=true` para testes e desenvolvimento autônomo. Rodar o
  serviço em modo live ou chamar `POST /api/refresh` consulta Artificial
  Analysis/OpenRouter e pode consumir quota ou créditos: peça aprovação antes.
- `service.sh start`, `restart` e `stop` controlam processos locais. Não rode
  contra ambientes compartilhados nem abra navegador automaticamente em
  automações; prefira `NO_BROWSER=1 USE_FIXTURES=true ./service.sh start`.
- Não publique, faça push, crie releases, altere credenciais, nem execute
  ações irreversíveis externas sem autorização explícita.

## Estado local e dados ignorados

- O serviço não possui banco, migrations nem cache persistente: testes usam
  fixtures sintéticas e o store em memória é descartável. Introduzir estado
  durável exige receita de teste descartável, backup provado por restore e
  operação documentada antes de depender dele.
- `models-data_2026-05-26.xlsx` é um artefato local ignorado, potencialmente
  sensível e sem classificação provada. Não o abra, copie, envie ou use como
  fixture. O desvio e a revisão estão em `bp-lock.yaml` / MODELS-12.

## Encerramento

Informe os arquivos alterados, verificações realmente executadas, riscos ou
pendências e a documentação atualizada. Não alegue resultado de CI, deploy ou
integração que não tenha sido executado.
