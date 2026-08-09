# ADR — retenção da planilha local legada ignorada

| Campo | Valor |
|---|---|
| Created | 2026-08-09 |
| Last review | 2026-08-09 |
| Version | 1.0 |
| Status | Accepted — desvio temporário |
| Owner | Dono do projeto |
| Review by | 2026-09-09 |

## Contexto

O Git ignora arquivos `*.xlsx`. Durante o upgrade para BP v2.13.0, foi
observado `models-data_2026-05-26.xlsx` (155 kB) na raiz. O código não o lê,
não há script versionado que o gere e não se verificou espelho externo.

## Decisão

Até conhecer origem, dono e conteúdo, a planilha é tratada como **dado de
versão única potencialmente sensível**. Ela não será aberta, copiada, enviada
nem usada em testes por automação. O desvio temporário de `core.md` §7.3 está
em `bp-lock.yaml`; MODELS-12 é o rastreador operacional.

## Consequências

Evita presumir que o arquivo é reprodutível ou seguro para upload, mas não
prova sua recuperação. Para encerrar o desvio, o dono deve classificá-lo como:

- reprodutível, com script versionado e nomeado; ou
- versão única, com RunGuide de espelho, frequência, responsável e último
  restore real datado.

Criar uma cópia externa é uma ação externa e requer autorização explícita.
