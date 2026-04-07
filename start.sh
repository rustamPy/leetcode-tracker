#!/usr/bin/env bash
# Start both backend (Python/FastAPI) and frontend (React/Vite)
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Backend ──────────────────────────────────────────────────
echo "▶ Starting Python backend on http://localhost:8000"
cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# ── Frontend ─────────────────────────────────────────────────
echo "▶ Starting React frontend on http://localhost:5173"
cd "$ROOT/frontend"
export NVM_DIR="${NVM_DIR:-/home/jack/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

echo ""
echo "✅  Backend:  http://localhost:8000"
echo "✅  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
