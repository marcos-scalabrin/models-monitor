# Journal — 2026-08-09 — Intake de conteúdo Trafor: custos de modelos

| Campo | Valor |
|---|---|
| Data | 2026-08-09 |
| Baseline | `bp-best-practices` v2.13.0, commit `8a8d704bb80f95aa742f4b9dcd6ec18a33b10a05` |
| Status | Encerramento local em preparação |
| Caráter | Retrospectivo, por solicitação explícita do dono no encerramento da sessão |
| Limite | O Journal não foi aberto antes da primeira edição; este fato é preservado como limitação, não tratado como evidência de abertura. |

## Plano retrospectivamente reconstruído

1. Preservar como entrada local o material de contexto da Trafor, ignorando `in/` no Git.
2. Extrair o posicionamento e coletar decisões de briefing para o material sobre monitoramento de custos de modelos.
3. Criar o work item abrangente no Plane, projeto INFRA/módulo MODELS, para artigo, LinkedIn e one-pager.
4. Registrar as definições comerciais e encerrar sem publicar conteúdo, chamar fontes pagas ou alterar o produto.

**Gate previsto e executado:** `git check-ignore`, `git diff --check` e `make check` em modo de fixtures.

**Fronteira de autonomia:** criar e atualizar o work item no Plane; não publicar conteúdo, não fazer push, não chamar `POST /api/refresh`, não usar dados de clientes nem o arquivo XLSX legado.

## Decisões

### D1 — Manter os materiais de entrada da Trafor fora do repositório

- **Decidido:** adicionar `in/` ao `.gitignore` e ler somente o arquivo Markdown fornecido pelo dono.
- **Por quê:** o diretório contém material local de briefing; ele não é artefato de produto nem deve entrar no histórico do Git.
- **Alternativas consideradas:** versionar o briefing, descartada por não haver mandato para publicar material de negócio; ignorar apenas um arquivo, descartada porque novos materiais de entrada teriam o mesmo caráter local.
- **Produzido:** `.gitignore` com a regra `in/`; confirmação por `git check-ignore -v in/trafor_contexto_monitor_modelos.md`.

### D2 — Posicionar a peça em eficiência financeira de IA, e não em “modelo mais barato”

- **Decidido:** a tese será eficiência no uso de orçamento de IA em USD por token, tarefa, processo e resultado, preservando qualidade, latência, privacidade e capacidade de agentes.
- **Por quê:** ela atende simultaneamente CFOs, CTOs e equipes técnicas e sustenta o posicionamento da Trafor como parceira de estratégia, tecnologia e implementação.
- **Alternativas consideradas:** focar apenas em benchmark técnico, descartada por não explicar a decisão econômica; focar somente em preço por token, descartada por omitir RAG, ferramentas, agentes, retries, infraestrutura e TCO local.
- **Produzido:** escopo e tese da MODELS-13.

### D3 — Criar uma peça-pilar com três derivativos comerciais

- **Decidido:** produzir um artigo principal, um post de LinkedIn e um one-pager comercial, usando cenários públicos e reproduzíveis para atendimento, documentos, RAG, coding e agentes.
- **Por quê:** uma fonte longa cria autoridade e mantém coerência nos materiais de distribuição e venda.
- **Alternativas consideradas:** produzir só um post, descartada por ser insuficiente para explicar método e trade-offs; usar cases de clientes, descartada porque ainda não existem dados autorizados.
- **Produzido:** work item `MODELS-13` — “Criar peça-pilar: eficiência de custos de IA por tokens”.

### D4 — Usar comparativos atuais, com fonte e premissas, e converter interesse por WhatsApp

- **Decidido:** escrever em português do Brasil para o mercado brasileiro; usar preços/capacidades atuais de modelos em fontes primárias; CTA para iniciar projeto de otimização pelo WhatsApp.
- **Por quê:** números verificáveis permitem que o leitor audite os cenários sem fazer alegações de resultado de cliente.
- **Alternativas consideradas:** faixas de economia ou cases anonimizados, descartados por não haver clientes/dados disponíveis; cenários sem fonte, descartados por reduzirem a credibilidade do material.
- **Produzido:** comentário interno `14370507-ffb5-409f-a2f0-a13190e62a20` na MODELS-13.

## Rastreio operacional

- Work item criado: `MODELS-13` (`39303e48-02b2-4feb-ba75-7f7be7c1fca8`), estado **Backlog**, prioridade **high**.
- Não houve trabalho de implementação do artigo nesta sessão; portanto, a issue não foi movida para `In Progress` nem marcada como concluída.

## Verificações

- `git check-ignore -v in/trafor_contexto_monitor_modelos.md` → `.gitignore:27:in/`, confirmando que o briefing está ignorado.
- `git diff --check` → sem saída, portanto sem erro de whitespace.
- `make check` → scan de segredos OK; `21 passed` no backend em fixtures; ESLint OK; TypeScript/Vite build OK. O Vite manteve o aviso não bloqueante de bundle acima de 500 kB.

## Pendências e riscos para a próxima sessão

- Produzir os três materiais de acordo com MODELS-13 e pesquisar preços/capacidades no momento da redação; dados de preço são temporais e devem trazer data de consulta.
- Definir o link `wa.me` e, opcionalmente, mensagem pré-preenchida do CTA.
- Não há case ou dado de cliente autorizado; todos os exemplos devem ser cenários públicos e reproduzíveis.

## Encerramento (§3.2)

O relatório de encerramento será acrescentado após a coleta da evidência bruta por `session-close.sh`. O escopo não inclui uma entrega de produto ou conteúdo publicado: inclui a configuração local de ignore, a decisão editorial e a criação/atualização da MODELS-13.
