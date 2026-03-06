#!/bin/bash
# Dev mode: runs backend and frontend in parallel
set -e

cd "$(dirname "$0")"

echo "Starting Command Center (dev mode)..."

# Start backend
(cd server && npm run dev) &
BACKEND_PID=$!

# Start frontend
(cd client && npm run dev) &
FRONTEND_PID=$!

echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173 (proxies /api to backend)"
echo ""
echo "Press Ctrl+C to stop both"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
