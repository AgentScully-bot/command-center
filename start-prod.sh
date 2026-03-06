#!/bin/bash
# Production: build frontend, then serve everything from the backend on port 3000
set -e

cd "$(dirname "$0")"

echo "Building Command Center for production..."

# Build frontend
echo "Building frontend..."
(cd client && npm run build)

# Build backend
echo "Building backend..."
(cd server && npm run build)

echo ""
echo "Starting production server on http://0.0.0.0:3000"
cd server && node dist/index.js
