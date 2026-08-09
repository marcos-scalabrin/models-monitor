.PHONY: check check-secrets check-backend check-frontend

# Gate único: os mesmos comandos são executados pelo CI após instalar as
# dependências travadas. USE_FIXTURES evita rede e consumo de credenciais.
check: check-secrets check-backend check-frontend

check-secrets:
	python3 tools/check_secrets.py

check-backend:
	cd backend && USE_FIXTURES=true uv run pytest -q

check-frontend:
	cd frontend && npm run lint && npm run build
