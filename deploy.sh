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

# [0/5] Run all tests
echo "[0/5] Running tests..."

TEST_PASSED=true
TESTS_DIR="$PROJECT_DIR/tests"
mkdir -p "$TESTS_DIR"

SERVER_PASS=0
SERVER_FAIL=0
SERVER_TOTAL=0
SERVER_ERRORS='[]'
CLIENT_PASS=0
CLIENT_FAIL=0
CLIENT_TOTAL=0
CLIENT_ERRORS='[]'
TEST_START=$(date +%s%3N)

cd "$PROJECT_DIR/server"
if SERVER_OUTPUT=$(npm test -- --reporter=json 2>&1); then
  SERVER_PASS=$(echo "$SERVER_OUTPUT" | grep -oP '"numPassedTests":\s*\K\d+' | head -1 || echo "0")
  SERVER_TOTAL=$(echo "$SERVER_OUTPUT" | grep -oP '"numTotalTests":\s*\K\d+' | head -1 || echo "0")
  SERVER_FAIL=0
  echo "  Server tests: ${SERVER_PASS} passed ✓"
else
  TEST_PASSED=false
  SERVER_PASS=$(echo "$SERVER_OUTPUT" | grep -oP '"numPassedTests":\s*\K\d+' | head -1 || echo "0")
  SERVER_FAIL=$(echo "$SERVER_OUTPUT" | grep -oP '"numFailedTests":\s*\K\d+' | head -1 || echo "0")
  SERVER_TOTAL=$(echo "$SERVER_OUTPUT" | grep -oP '"numTotalTests":\s*\K\d+' | head -1 || echo "0")
  # Extract failed test names
  SERVER_ERRORS=$(echo "$SERVER_OUTPUT" | grep -oP '"fullName":\s*"\K[^"]+' | head -10 | jq -R -s 'split("\n") | map(select(. != ""))' 2>/dev/null || echo '[]')
  echo "  Server tests: FAILED (${SERVER_FAIL} failures) ✗"
fi

cd "$PROJECT_DIR/client"
if CLIENT_OUTPUT=$(npm test -- --reporter=json 2>&1); then
  CLIENT_PASS=$(echo "$CLIENT_OUTPUT" | grep -oP '"numPassedTests":\s*\K\d+' | head -1 || echo "0")
  CLIENT_TOTAL=$(echo "$CLIENT_OUTPUT" | grep -oP '"numTotalTests":\s*\K\d+' | head -1 || echo "0")
  CLIENT_FAIL=0
  echo "  Client tests: ${CLIENT_PASS} passed ✓"
else
  TEST_PASSED=false
  CLIENT_PASS=$(echo "$CLIENT_OUTPUT" | grep -oP '"numPassedTests":\s*\K\d+' | head -1 || echo "0")
  CLIENT_FAIL=$(echo "$CLIENT_OUTPUT" | grep -oP '"numFailedTests":\s*\K\d+' | head -1 || echo "0")
  CLIENT_TOTAL=$(echo "$CLIENT_OUTPUT" | grep -oP '"numTotalTests":\s*\K\d+' | head -1 || echo "0")
  CLIENT_ERRORS=$(echo "$CLIENT_OUTPUT" | grep -oP '"fullName":\s*"\K[^"]+' | head -10 | jq -R -s 'split("\n") | map(select(. != ""))' 2>/dev/null || echo '[]')
  echo "  Client tests: FAILED (${CLIENT_FAIL} failures) ✗"
fi

TEST_END=$(date +%s%3N)
DURATION_MS=$((TEST_END - TEST_START))
DURATION_S=$(echo "scale=1; $DURATION_MS / 1000" | bc)

# Save test results
cat > "$TESTS_DIR/last-run.json" << JSONEOF
{
  "timestamp": "$(date -Iseconds)",
  "passed": $TEST_PASSED,
  "server": {
    "total": $SERVER_TOTAL,
    "passed": $SERVER_PASS,
    "failed": $SERVER_FAIL,
    "errors": $SERVER_ERRORS
  },
  "client": {
    "total": $CLIENT_TOTAL,
    "passed": $CLIENT_PASS,
    "failed": $CLIENT_FAIL,
    "errors": $CLIENT_ERRORS
  },
  "duration": "${DURATION_S}s"
}
JSONEOF

if [ "$TEST_PASSED" = false ]; then
  echo ""
  echo "⛔ Tests failed — deployment blocked"
  echo "   See tests/last-run.json for details"
  echo ""

  # Add waiting tag to TASKS.md
  TASKS_FILE="$PROJECT_DIR/TASKS.md"
  if grep -q "## 🔴 Blocked" "$TASKS_FILE"; then
    sed -i "/## 🔴 Blocked/a\\- [ ] Deploy blocked: test failures on $(date +%Y-%m-%d) [waiting:owner]" "$TASKS_FILE"
  fi

  # Notify assistant
  openclaw system event --text "Deploy BLOCKED for command-center: test failures. Check tests/last-run.json for details." --mode now 2>/dev/null || true

  exit 1
fi

echo ""

# Ensure deployment dir exists
mkdir -p "$DEPLOY_DIR"/{server,client,logs}

# Build backend
echo "[1/5] Building backend..."
(cd "$PROJECT_DIR/server" && npm install --silent && npm run build)

# Build frontend
echo "[2/5] Building frontend..."
(cd "$PROJECT_DIR/client" && npm install --silent && npm run build)

# Copy artifacts (overwrite old, preserve .env and logs)
# Note: prompts/ and scripts/ are dev-only, not deployed
echo "[3/5] Copying artifacts to deployment..."
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
echo "[4/5] Restarting service..."
if systemctl --user is-enabled "$SERVICE_NAME" &>/dev/null; then
  systemctl --user restart "$SERVICE_NAME"
  echo "Service restarted."
else
  echo "No systemd service found. Start manually:"
  echo "  cd $DEPLOY_DIR/server && node dist/index.js"
  echo "Or install the service — see DEPLOYMENT.md"
fi

# Save successful test results
echo "[5/5] Recording deploy success..."
echo ""
echo "=== Deployed successfully ==="
echo "URL: http://$(hostname -I | awk '{print $1}'):$(grep PORT $DEPLOY_DIR/.env 2>/dev/null | cut -d= -f2 || echo 3000)"
