#!/usr/bin/env bash
set -euo pipefail

TRACKER_FILE="${AGENT_TRACKER_FILE:-$HOME/deployments/command-center/agent-tracker.json}"
TRACKER_DIR="$(dirname "$TRACKER_FILE")"

# Ensure tracker file exists
init_tracker() {
  mkdir -p "$TRACKER_DIR"
  if [[ ! -f "$TRACKER_FILE" ]]; then
    echo '{"version":1,"agents":[]}' > "$TRACKER_FILE"
  fi
}

# Atomic write: write to temp file then mv
atomic_write() {
  local tmp
  tmp=$(mktemp "${TRACKER_DIR}/.agent-tracker.XXXXXX")
  cat > "$tmp"
  mv -f "$tmp" "$TRACKER_FILE"
}

# Read current tracker JSON
read_tracker() {
  cat "$TRACKER_FILE"
}

cmd_start() {
  local task="" project="" pid="" model=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --task)   task="$2";    shift 2 ;;
      --project) project="$2"; shift 2 ;;
      --pid)    pid="$2";     shift 2 ;;
      --model)  model="$2";   shift 2 ;;
      *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
  done

  if [[ -z "$task" || -z "$project" || -z "$pid" || -z "$model" ]]; then
    echo "Usage: track-agent.sh start --task TASK --project PROJECT --pid PID --model MODEL" >&2
    exit 1
  fi

  local now_s now_ms id
  now_s=$(date +%s)
  now_ms=$((now_s * 1000))
  id="$now_s"

  init_tracker
  read_tracker | jq --arg id "$id" \
    --arg task "$task" \
    --arg project "$project" \
    --argjson pid "$pid" \
    --arg model "$model" \
    --argjson now "$now_ms" \
    '.agents += [{
      id: $id,
      task: $task,
      project: $project,
      pid: $pid,
      model: $model,
      provider: "anthropic",
      status: "running",
      startedAt: $now,
      completedAt: null,
      summary: null,
      error: null
    }]' | atomic_write

  echo "$id"
}

cmd_complete() {
  local id="${1:-}"
  shift || true
  local summary=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --summary) summary="$2"; shift 2 ;;
      *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
  done

  if [[ -z "$id" ]]; then
    echo "Usage: track-agent.sh complete <id> [--summary TEXT]" >&2
    exit 1
  fi

  init_tracker
  local now_ms
  now_ms=$(($(date +%s) * 1000))

  local summary_arg="null"
  [[ -n "$summary" ]] && summary_arg="\"$summary\""

  read_tracker | jq --arg id "$id" \
    --argjson now "$now_ms" \
    --argjson summary "$summary_arg" \
    '(.agents[] | select(.id == $id)) |= (
      .status = "completed" |
      .completedAt = $now |
      .summary = $summary
    )' | atomic_write

  echo "Marked $id as completed"
}

cmd_error() {
  local id="${1:-}"
  shift || true
  local message=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --message) message="$2"; shift 2 ;;
      *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
  done

  if [[ -z "$id" ]]; then
    echo "Usage: track-agent.sh error <id> [--message TEXT]" >&2
    exit 1
  fi

  init_tracker
  local now_ms
  now_ms=$(($(date +%s) * 1000))

  local msg_arg="null"
  [[ -n "$message" ]] && msg_arg="\"$message\""

  read_tracker | jq --arg id "$id" \
    --argjson now "$now_ms" \
    --argjson msg "$msg_arg" \
    '(.agents[] | select(.id == $id)) |= (
      .status = "errored" |
      .completedAt = $now |
      .error = $msg
    )' | atomic_write

  echo "Marked $id as errored"
}

cmd_cleanup() {
  init_tracker
  local now_ms
  now_ms=$(($(date +%s) * 1000))
  local data
  data=$(read_tracker)
  local changed=false

  # Get IDs and PIDs of running agents
  local ids pids
  ids=$(echo "$data" | jq -r '.agents[] | select(.status == "running") | .id')
  pids=$(echo "$data" | jq -r '.agents[] | select(.status == "running") | .pid')

  local id_arr pid_arr
  readarray -t id_arr <<< "$ids"
  readarray -t pid_arr <<< "$pids"

  for i in "${!id_arr[@]}"; do
    local aid="${id_arr[$i]}"
    local apid="${pid_arr[$i]}"
    [[ -z "$aid" || -z "$apid" ]] && continue
    if ! kill -0 "$apid" 2>/dev/null; then
      data=$(echo "$data" | jq --arg id "$aid" --argjson now "$now_ms" \
        '(.agents[] | select(.id == $id)) |= (
          .status = "crashed" |
          .completedAt = $now |
          .error = "Process exited unexpectedly"
        )')
      changed=true
      echo "Marked $aid (PID $apid) as crashed"
    fi
  done

  if [[ "$changed" == "true" ]]; then
    echo "$data" | atomic_write
  else
    echo "No stale agents found"
  fi
}

cmd_reset() {
  init_tracker
  local now_ms
  now_ms=$(($(date +%s) * 1000))

  read_tracker | jq --argjson now "$now_ms" \
    '(.agents[] | select(.status == "running")) |= (
      .status = "stale" |
      .completedAt = $now |
      .error = "Reset: marked stale on server startup or manual reset"
    )' | atomic_write

  echo "All running agents marked as stale"
}

cmd_list() {
  init_tracker
  local data
  data=$(read_tracker)
  local count
  count=$(echo "$data" | jq '.agents | length')

  if [[ "$count" -eq 0 ]]; then
    echo "No tracked agents."
    return
  fi

  echo "$data" | jq -r '.agents[] | [
    "[\(.status | ascii_upcase)]",
    "id=\(.id)",
    "project=\(.project)",
    "task=\"\(.task)\"",
    "model=\(.model)",
    "pid=\(.pid)",
    if .summary then "summary=\"\(.summary)\"" else empty end,
    if .error then "error=\"\(.error)\"" else empty end
  ] | join("  ")'
}

# Main dispatch
case "${1:-}" in
  start)    shift; cmd_start "$@" ;;
  complete) shift; cmd_complete "$@" ;;
  error)    shift; cmd_error "$@" ;;
  cleanup)  shift; cmd_cleanup ;;
  list)     shift; cmd_list ;;
  reset)    shift; cmd_reset ;;
  *)
    echo "Usage: track-agent.sh {start|complete|error|cleanup|list|reset}" >&2
    exit 1
    ;;
esac
