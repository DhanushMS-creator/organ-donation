#!/usr/bin/env bash

set -euo pipefail

if [ -x venv/bin/python ]; then
  backend_cmd=(venv/bin/python backend/app.py)
elif [ -x .venv/bin/python ]; then
  backend_cmd=(.venv/bin/python backend/app.py)
else
  backend_cmd=(python3 backend/app.py)
fi

"${backend_cmd[@]}" &
backend_pid=$!

npm --prefix frontend-react run dev -- --host 127.0.0.1 &
frontend_pid=$!

cleanup() {
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
}

trap cleanup INT TERM EXIT
wait