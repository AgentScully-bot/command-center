#!/usr/bin/env bash
set -euo pipefail

# check-approved.sh — Check for approved tasks and kick off a coder agent if none running
# Called by OpenClaw heartbeat to auto-start implementation of approved features.

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TASKS_FILE="$PROJECT_DIR/TASKS.md"
TRACKER="$PROJECT_DIR/scripts/track-agent.sh"
RUN_APPROVED="$PROJECT_DIR/scripts/run-approved.sh"
LOCKFILE="/tmp/command-center-coder.lock"
MEMORY_DIR="$PROJECT_DIR/memory"

# Check if any features exist under ## Approved in TASKS.md
has_approved_features() {
  local in_approved=false
  while IFS= read -r line; do
    if [[ "$line" =~ ^##[[:space:]]+(🟢[[:space:]]+)?Approved ]]; then
      in_approved=true
      continue
    fi
    if [[ "$line" =~ ^##[[:space:]] ]] && $in_approved; then
      break
    fi
    if $in_approved && [[ "$line" =~ ^###[[:space:]] ]]; then
      return 0
    fi
  done < "$TASKS_FILE"
  return 1
}

# Check if a coder agent is already running (via track-agent.sh)
agent_is_running() {
  "$TRACKER" cleanup >/dev/null 2>&1
  "$TRACKER" list 2>/dev/null | grep -q '^\[RUNNING\]'
}

# Check lockfile — is a previously spawned process still alive?
lockfile_active() {
  if [[ ! -f "$LOCKFILE" ]]; then
    return 1
  fi
  local pid
  pid=$(cat "$LOCKFILE" 2>/dev/null || true)
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  # Stale lockfile — clean it up
  rm -f "$LOCKFILE"
  return 1
}

log_kickoff() {
  local msg="$1"
  local date_file
  date_file="$(date +%Y-%m-%d)"
  local log_file="$MEMORY_DIR/${date_file}.md"
  mkdir -p "$MEMORY_DIR"
  local timestamp
  timestamp="$(date +%H:%M:%S)"
  echo "- **$timestamp** — $msg" >> "$log_file"
}

# --- Main ---

if [[ ! -f "$TASKS_FILE" ]]; then
  exit 0
fi

# No approved features? Exit silently.
if ! has_approved_features; then
  exit 0
fi

# Agent already running? Exit silently.
if agent_is_running; then
  exit 0
fi

# Lockfile still active? Exit silently.
if lockfile_active; then
  exit 0
fi

# Kick off the coder agent
log_kickoff "Heartbeat auto-kickoff: spawning coder for approved tasks"

# run-approved.sh runs in the foreground (it waits for the agent).
# We run it in the background and record its PID in the lockfile.
bash "$RUN_APPROVED" --use-generic &
SPAWNED_PID=$!
echo "$SPAWNED_PID" > "$LOCKFILE"

echo "Auto-kickoff started: PID $SPAWNED_PID"
