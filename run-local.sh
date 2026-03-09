#!/usr/bin/env sh
set -euo pipefail

BACKEND_PORT=${BACKEND_PORT:-8097}
FRONTEND_PORT=${FRONTEND_PORT:-5174}
DATABASE_PATH=${DATABASE_PATH:-brick-library.db}

export PORT="$BACKEND_PORT"
export DATABASE_PATH

npm --prefix backend run start &
BACKEND_PID=$!

export PORT="$FRONTEND_PORT"
npm --prefix frontend run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" INT TERM QUIT EXIT

wait
