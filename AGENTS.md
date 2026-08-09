# Instruções para agentes

## Baseline e contexto

Este projeto adota `bp-best-practices` **v2.7.0**, fixada no commit
`125a1c459a8e30fefdf8151a167c870f8f3954ca`; a proveniência e os perfis ativos
estão em [`bp-lock.yaml`](bp-lock.yaml). Antes de editar, leia este arquivo,
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

## Encerramento

Informe os arquivos alterados, verificações realmente executadas, riscos ou
pendências e a documentação atualizada. Não alegue resultado de CI, deploy ou
integração que não tenha sido executado.
