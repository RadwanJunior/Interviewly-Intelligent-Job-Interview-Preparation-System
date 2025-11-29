#!/usr/bin/env bash
set -euo pipefail

# Default ports if not provided
PORT="${PORT:-8000}"
N8N_PORT="${N8N_PORT:-5678}"

# Start n8n in background
echo "Starting n8n on port ${N8N_PORT}..."
n8n start --tunnel --port "${N8N_PORT}" &
N8N_PID=$!

# Start uvicorn (FastAPI)
echo "Starting uvicorn on port ${PORT}..."
uvicorn app.main:app --host 0.0.0.0 --port "${PORT}" &
UVICORN_PID=$!

trap 'echo "Shutting down..."; kill ${N8N_PID} ${UVICORN_PID}; wait' TERM INT

wait
