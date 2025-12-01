#!/usr/bin/env bash
set -euo pipefail

# Default ports if not provided
PORT="${PORT:-8000}"
N8N_PORT="${N8N_PORT:-5678}"

# Start n8n in background
echo "Starting n8n on port ${N8N_PORT}..."
N8N_PORT="${N8N_PORT}" npx n8n start &
N8N_PID=$!

# Start uvicorn (FastAPI)
echo "Starting uvicorn on port ${PORT}..."
uvicorn app.main:app --host 0.0.0.0 --port "${PORT}" &
UVICORN_PID=$!

shutdown() {
  echo "Shutting down..."
  kill ${N8N_PID} ${UVICORN_PID} 2>/dev/null || true
}

trap 'shutdown' TERM INT

# If either process exits, stop the container so orchestration can restart it.
wait -n ${N8N_PID} ${UVICORN_PID}
EXIT_CODE=$?
shutdown
wait
exit ${EXIT_CODE}
