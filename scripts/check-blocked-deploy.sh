#!/usr/bin/env bash
# check-blocked-deploy.sh — If a deploy-blocked item exists in TASKS.md and tests now pass,
# clear the block and re-run deploy.sh automatically.
#
# Called by check-approved.sh on every heartbeat.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TASKS_FILE="$PROJECT_DIR/TASKS.md"
LAST_RUN="$PROJECT_DIR/tests/last-run.json"
MEMORY_DIR="$PROJECT_DIR/memory"

log_action() {
  local msg="$1"
  local date_file
  date_file="$(date +%Y-%m-%d)"
  local log_file="$MEMORY_DIR/${date_file}.md"
  mkdir -p "$MEMORY_DIR"
  echo "- **$(date +%H:%M:%S)** — $msg" >> "$log_file"
}

# Is there a deploy-blocked item?
if ! grep -q "Deploy blocked:.*\[waiting:owner\]" "$TASKS_FILE" 2>/dev/null; then
  exit 0
fi

# Do we have test results to check?
if [[ ! -f "$LAST_RUN" ]]; then
  exit 0
fi

# Did the last test run pass?
PASSED=$(jq -r '.passed' "$LAST_RUN" 2>/dev/null || echo "false")
if [[ "$PASSED" != "true" ]]; then
  # Tests still failing — leave the block in place
  exit 0
fi

# Tests are passing — clear the stale blocked item
echo "Tests are passing — clearing stale deploy block..."
sed -i '/Deploy blocked:.*\[waiting:owner\]/d' "$TASKS_FILE"

log_action "Auto-cleared stale deploy block (tests now passing). Re-running deploy."

# Notify
openclaw system event --text "Deploy block cleared for command-center: tests are now passing. Re-deploying..." --mode now 2>/dev/null || true

# Re-run deploy
echo "Re-running deploy.sh..."
bash "$PROJECT_DIR/deploy.sh"
