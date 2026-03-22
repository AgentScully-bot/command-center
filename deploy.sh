#!/bin/bash
# deploy.sh — Build and deploy Command Center to ~/deployments/command-center/
# Source stays clean. Secrets stay in deployment .env. Artifacts get overwritten.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$HOME/deployments/command-center"
SERVICE_NAME="command-center"

echo "=== Command Center Deploy ==="
echo "Source:     $PROJECT_DIR"
echo "Deploy to:  $DEPLOY_DIR"
echo ""

# Ensure deployment dir exists
mkdir -p "$DEPLOY_DIR"/{server,client,logs}

# Build backend
echo "[1/4] Building backend..."
(cd "$PROJECT_DIR/server" && npm install --silent && npm run build)

# Build frontend
echo "[2/4] Building frontend..."
(cd "$PROJECT_DIR/client" && npm install --silent && npm run build)

# Copy artifacts (overwrite old, preserve .env and logs)
# Note: prompts/ and scripts/ are dev-only, not deployed
echo "[3/4] Copying artifacts to deployment..."
rsync -a --delete "$PROJECT_DIR/server/dist/" "$DEPLOY_DIR/server/dist/"
rsync -a "$PROJECT_DIR/server/package.json" "$DEPLOY_DIR/server/"
rsync -a "$PROJECT_DIR/server/package-lock.json" "$DEPLOY_DIR/server/"
rsync -a --delete "$PROJECT_DIR/server/node_modules/" "$DEPLOY_DIR/server/node_modules/"
rsync -a --delete "$PROJECT_DIR/client/dist/" "$DEPLOY_DIR/client/dist/"

# Create .env if it doesn't exist (never overwrite — secrets live here)
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  echo "[!] Creating default .env (edit with your config)"
  cat > "$DEPLOY_DIR/.env" << 'ENVEOF'
PORT=3000
HOST=0.0.0.0
OPENCLAW_HOME=$HOME/.openclaw
PROJECTS_DIR=$HOME/projects
IDEAS_DIR=$HOME/projects/ideas
ENVEOF
fi

# Restart service if it exists
echo "[4/4] Restarting service..."
if systemctl --user is-enabled "$SERVICE_NAME" &>/dev/null; then
  systemctl --user restart "$SERVICE_NAME"
  echo "Service restarted."
else
  echo "No systemd service found. Start manually:"
  echo "  cd $DEPLOY_DIR/server && node dist/index.js"
  echo "Or install the service — see DEPLOYMENT.md"
fi

# Save successful deploy log
echo "{\"status\":\"success\",\"deployedAt\":\"$(date -Iseconds)\"}" > "$DEPLOY_DIR/deploy-log.json"
echo ""
echo "=== Deployed successfully ==="
echo "URL: http://$(hostname -I | awk '{print $1}'):$(grep PORT $DEPLOY_DIR/.env 2>/dev/null | cut -d= -f2 || echo 3000)"
