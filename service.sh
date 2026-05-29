#!/usr/bin/env bash
# Models Monitor — dev service manager
# Usage: ./service.sh {start|stop|restart|status|logs [backend|frontend]}
#
# Optional env vars:
#   BACKEND_PORT   default 8890
#   FRONTEND_PORT  default 5173
#   USE_FIXTURES   "true" to serve bundled fixtures instead of live data
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8890}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
RUN_DIR="$SCRIPT_DIR/.run"
mkdir -p "$RUN_DIR"

BACKEND_PID="$RUN_DIR/backend.pid"
FRONTEND_PID="$RUN_DIR/frontend.pid"
BACKEND_LOG="$RUN_DIR/backend.log"
FRONTEND_LOG="$RUN_DIR/frontend.log"

# --- helpers ---------------------------------------------------------------

c_red()   { printf '\033[31m%s\033[0m' "$*"; }
c_green() { printf '\033[32m%s\033[0m' "$*"; }
c_dim()   { printf '\033[2m%s\033[0m' "$*"; }

is_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file" 2>/dev/null)" 2>/dev/null
}

port_busy() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tlnH 2>/dev/null | awk '{print $4}' | grep -qE ":${port}\$"
  else
    netstat -tlnp 2>/dev/null | awk '{print $4}' | grep -qE ":${port}\$"
  fi
}

wait_http() {
  local url="$1" max="${2:-20}"
  for _ in $(seq 1 "$max"); do
    if curl -sf -o /dev/null --max-time 1 "$url"; then return 0; fi
    sleep 0.5
  done
  return 1
}

open_in_browser() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    (xdg-open "$url" >/dev/null 2>&1 &)
  elif command -v open >/dev/null 2>&1; then
    (open "$url" >/dev/null 2>&1 &)
  else
    return 1
  fi
}

# --- start / stop ----------------------------------------------------------

start_backend() {
  if is_running "$BACKEND_PID"; then
    echo "backend: $(c_green "já rodando") (pid $(cat "$BACKEND_PID"))"
    return
  fi
  if port_busy "$BACKEND_PORT"; then
    echo "backend: $(c_red "porta $BACKEND_PORT ocupada") por outro processo — derrube antes"
    return 1
  fi
  if [[ ! -f "$SCRIPT_DIR/backend/.env" ]]; then
    echo "backend: $(c_red "backend/.env não encontrado") — copie de .env.example e coloque a AA_API_KEY"
    return 1
  fi
  echo "backend: iniciando :$BACKEND_PORT (log → $BACKEND_LOG)"
  (
    cd "$SCRIPT_DIR/backend"
    [[ ! -d .venv ]] && uv sync >/dev/null
    setsid nohup uv run uvicorn app.main:app \
      --host 127.0.0.1 --port "$BACKEND_PORT" --reload --log-level warning \
      > "$BACKEND_LOG" 2>&1 < /dev/null &
    echo $! > "$BACKEND_PID"
  )
  sleep 0.5
  echo "  $(c_green ✓) pid $(cat "$BACKEND_PID")"
}

start_frontend() {
  if is_running "$FRONTEND_PID"; then
    echo "frontend: $(c_green "já rodando") (pid $(cat "$FRONTEND_PID"))"
    return
  fi
  if port_busy "$FRONTEND_PORT"; then
    echo "frontend: $(c_red "porta $FRONTEND_PORT ocupada") por outro processo — derrube antes"
    return 1
  fi
  echo "frontend: iniciando :$FRONTEND_PORT (log → $FRONTEND_LOG)"
  (
    cd "$SCRIPT_DIR/frontend"
    [[ ! -d node_modules ]] && npm install >/dev/null
    setsid nohup npm run dev > "$FRONTEND_LOG" 2>&1 < /dev/null &
    echo $! > "$FRONTEND_PID"
  )
  sleep 0.5
  echo "  $(c_green ✓) pid $(cat "$FRONTEND_PID")"
}

stop_one() {
  local pid_file="$1" name="$2"
  if ! is_running "$pid_file"; then
    echo "$name: $(c_dim "não estava rodando")"
    rm -f "$pid_file"
    return
  fi
  local pid; pid=$(cat "$pid_file")
  echo "$name: parando (pid $pid)…"
  # kill the whole process group (setsid put it in its own group)
  kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  for _ in $(seq 1 25); do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.2
  done
  if kill -0 "$pid" 2>/dev/null; then
    echo "  forçando…"
    kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
  fi
  rm -f "$pid_file"
  echo "  $(c_green ✓) parado"
}

status_one() {
  local pid_file="$1" name="$2" port="$3"
  if is_running "$pid_file"; then
    printf "  %s %-8s pid %-7s http://127.0.0.1:%s\n" "$(c_green '●')" "$name" "$(cat "$pid_file")" "$port"
  elif port_busy "$port"; then
    printf "  %s %-8s porta :%s ocupada por processo desconhecido (não pelo script)\n" "$(c_red '?')" "$name" "$port"
  else
    printf "  %s %-8s parado\n" "$(c_red '○')" "$name"
  fi
}

# --- entry point -----------------------------------------------------------

case "${1:-status}" in
  start)
    start_backend
    start_frontend
    url="http://localhost:$FRONTEND_PORT"
    echo
    if wait_http "http://127.0.0.1:$FRONTEND_PORT/" 20; then
      if [[ "${NO_BROWSER:-}" == "1" ]]; then
        echo "abra → $url"
      elif open_in_browser "$url"; then
        echo "abrindo no navegador → $url"
      else
        echo "abra → $url  (nenhum xdg-open/open disponível)"
      fi
    else
      echo "abra → $url  (frontend ainda subindo)"
    fi
    ;;
  stop)
    stop_one "$FRONTEND_PID" frontend
    stop_one "$BACKEND_PID" backend
    ;;
  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;
  status)
    status_one "$BACKEND_PID"  backend  "$BACKEND_PORT"
    status_one "$FRONTEND_PID" frontend "$FRONTEND_PORT"
    ;;
  logs)
    target="${2:-backend}"
    case "$target" in
      backend)  tail -f "$BACKEND_LOG" ;;
      frontend) tail -f "$FRONTEND_LOG" ;;
      *) echo "uso: $0 logs [backend|frontend]"; exit 1 ;;
    esac
    ;;
  *)
    cat <<EOF
uso: $0 {start|stop|restart|status|logs [backend|frontend]}

  start      sobe backend (:$BACKEND_PORT) e frontend (:$FRONTEND_PORT) em background
  stop       derruba ambos (mata o process group)
  restart    stop + start
  status     mostra quem está vivo
  logs [x]   tail nos logs de backend (default) ou frontend

Variáveis: BACKEND_PORT, FRONTEND_PORT, USE_FIXTURES
EOF
    exit 1
    ;;
esac
