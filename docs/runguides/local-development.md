# RunGuide — desenvolvimento local

| Campo | Valor |
|---|---|
| Created | 2026-08-06 |
| Last review | 2026-08-06 |
| Version | 1.0 |
| Status | Active |

## Finalidade e pré-requisitos

Use este guia para desenvolver ou diagnosticar o serviço localmente. Requer
Python/`uv`, Node 22/npm e um clone com as dependências travadas. Copie
`backend/.env.example` para `backend/.env` se for usar `service.sh`; jamais
versione o arquivo criado.

## Procedimento seguro

1. Instale as dependências travadas sem sair da raiz:
   `(cd backend && uv sync --locked)` e `(cd frontend && npm ci)`.
2. Rode `make check`. Ele usa fixtures e não consulta provedores externos.
3. Para subir a interface local sem rede nem navegador automático, rode
   `NO_BROWSER=1 USE_FIXTURES=true ./service.sh start`.
4. Confira `./service.sh status`; o frontend responde em `:5173` e a API em
   `127.0.0.1:8890`. Essas são portas atuais do projeto, não devem ser
   alteradas sem confirmação do dono.
5. Pare os processos iniciados por este guia com `./service.sh stop`.

## Verificação de sucesso

- Gate: `make check` termina com sucesso.
- Serviço local: `curl -fsS http://127.0.0.1:8890/api/health` retorna
  `{"status":"ok"}` e o dashboard abre em `http://localhost:5173`.

## Operações live e contenção

O modo sem `USE_FIXTURES=true` e `POST /api/refresh` consultam Artificial
Analysis/OpenRouter e podem consumir quota/créditos. Exigem aprovação explícita
e uma `AA_API_KEY` apenas no ambiente local. Se uma execução local falhar ou
ficar presa, use `./service.sh logs [backend|frontend]` para coletar evidência
sem imprimir segredos e `./service.sh stop` para conter os processos.
