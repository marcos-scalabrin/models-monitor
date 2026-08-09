# Instruções para Claude Code

Este projeto adota `bp-best-practices` **v2.13.0**, fixada no commit de release
`8a8d704bb80f95aa742f4b9dcd6ec18a33b10a05`. Leia
[`bp-lock.yaml`](bp-lock.yaml), [`AGENTS.md`](AGENTS.md), o
[README](README.md), o [TestPlan](docs/testplans/testplan-service.md) e os
documentos relevantes antes de editar. As instruções locais e desvios
documentados prevalecem sobre a baseline.

- Plane (`tp_ai` / `INFRA` / `MODELS`) é a fonte de verdade para trabalho não
  trivial; `make check` é o gate único e o CI executa o mesmo comando.
- Em sessão autônoma, abra o Journal com Plano antes de editar, use worktree se
  houver concorrência e encerre com a tabela de sete itens da BP §3.2.
- `Done` requer checador independente em árvore própria sobre SHA imutável. O
  prompt, evidência ancorada, comandos, veredito e papel/modelo ficam no item;
  checagem e execução não podem usar modelo inferior ao executor.
- Não altere API pública, portas, deploy, infraestrutura ou comportamento sem
  aprovação explícita. Modo live e `POST /api/refresh` consomem fontes externas
  e também exigem aprovação.
- Segredos ficam no ambiente ou `backend/.env`; não imprima nem versione. A
  planilha local `models-data_2026-05-26.xlsx` é potencialmente sensível e não
  deve ser aberta, copiada ou enviada; acompanhe MODELS-12.

Ao encerrar, informe arquivos mudados, verificações executadas, riscos e docs
atualizadas. Não alegue CI, deploy, integração ou backup sem executar a prova.
