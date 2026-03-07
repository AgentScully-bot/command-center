#!/usr/bin/env bash
set -euo pipefail

# run-approved.sh — Find approved features in TASKS.md, match to prompt files, spawn coder agent
#
# Usage:
#   ./scripts/run-approved.sh              # spawn first matched feature
#   ./scripts/run-approved.sh --dry-run    # just show what would be spawned
#   ./scripts/run-approved.sh --use-generic # use _generic.md if no specific prompt exists

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TASKS_FILE="$PROJECT_DIR/TASKS.md"
PROMPTS_DIR="$PROJECT_DIR/prompts"
TRACKER="$PROJECT_DIR/scripts/track-agent.sh"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

DRY_RUN=false
USE_GENERIC=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)     DRY_RUN=true;     shift ;;
    --use-generic) USE_GENERIC=true;  shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -f "$TASKS_FILE" ]]; then
  echo "Error: TASKS.md not found at $TASKS_FILE" >&2
  exit 1
fi

# Extract ### headings under the ## Approved section
# Reads from "## Approved" (or "## 🟢 Approved") until the next ## heading
extract_approved_features() {
  local in_approved=false
  while IFS= read -r line; do
    # Detect start of Approved section
    if [[ "$line" =~ ^##[[:space:]]+(🟢[[:space:]]+)?Approved ]]; then
      in_approved=true
      continue
    fi
    # Detect next top-level section (stop)
    if [[ "$line" =~ ^##[[:space:]] ]] && $in_approved; then
      break
    fi
    # Capture ### headings within Approved
    if $in_approved && [[ "$line" =~ ^###[[:space:]]+(.*) ]]; then
      echo "${BASH_REMATCH[1]}"
    fi
  done < "$TASKS_FILE"
}

# Convert heading to kebab-case filename (delegates to shared script)
to_kebab() {
  "$SCRIPT_DIR/to-kebab.sh" "$1"
}

# Try fuzzy match and self-heal misnamed prompt files
# Usage: fuzzy_match_prompt <kebab> → sets prompt_file if match found
fuzzy_match_prompt() {
  local kebab="$1"
  local prompt_file="$PROMPTS_DIR/$kebab.md"
  if [[ -f "$prompt_file" ]]; then
    echo "$prompt_file"
    return 0
  fi
  # Try fuzzy: convert kebab hyphens to regex dots for flexible matching
  local pattern
  pattern=$(echo "$kebab" | tr '-' '.')
  local fuzzy
  fuzzy=$(ls "$PROMPTS_DIR"/*.md 2>/dev/null | xargs -I{} basename {} .md | grep -v '^_' | grep -i "$pattern" | head -1)
  if [[ -n "$fuzzy" ]]; then
    echo "  ⚠ Fuzzy match: $kebab → $fuzzy (renaming)" >&2
    mv "$PROMPTS_DIR/$fuzzy.md" "$prompt_file"
    echo "$prompt_file"
    return 0
  fi
  return 1
}

# Move a feature heading + its tasks from Approved to In Progress in TASKS.md
move_to_in_progress() {
  local feature_heading="$1"
  local tmp
  tmp=$(mktemp)

  local in_approved=false
  local in_feature=false
  local feature_block=""
  local skipping=false

  # First pass: extract the feature block and remove it from Approved
  while IFS= read -r line; do
    # Detect Approved section
    if [[ "$line" =~ ^##[[:space:]]+(🟢[[:space:]]+)?Approved ]]; then
      in_approved=true
      echo "$line" >> "$tmp"
      continue
    fi

    # Detect next section after Approved
    if [[ "$line" =~ ^##[[:space:]] ]] && $in_approved && ! $in_feature; then
      in_approved=false
    fi

    # Found our feature heading in Approved
    if $in_approved && [[ "$line" =~ ^###[[:space:]] ]] && [[ "$line" == *"$feature_heading"* ]]; then
      in_feature=true
      skipping=true
      feature_block="$line"$'\n'
      continue
    fi

    # If we're collecting the feature block
    if $skipping; then
      # Next ### heading or ## heading means end of feature block
      if [[ "$line" =~ ^##[[:space:]] ]] || [[ "$line" =~ ^###[[:space:]] ]]; then
        skipping=false
        in_feature=false
        in_approved=false
        echo "$line" >> "$tmp"
        continue
      fi
      feature_block+="$line"$'\n'
      continue
    fi

    echo "$line" >> "$tmp"
  done < "$TASKS_FILE"

  # Second pass: insert feature block into In Progress section
  local tmp2
  tmp2=$(mktemp)
  local inserted=false
  while IFS= read -r line; do
    echo "$line" >> "$tmp2"
    if ! $inserted && [[ "$line" =~ ^##[[:space:]]+(🟡[[:space:]]+)?In[[:space:]]+Progress ]]; then
      # Insert feature block after In Progress heading
      printf '%s' "$feature_block" >> "$tmp2"
      inserted=true
    fi
  done < "$tmp"

  mv -f "$tmp2" "$TASKS_FILE"
  rm -f "$tmp"
}

# Main logic
features=$(extract_approved_features)

if [[ -z "$features" ]]; then
  echo "No approved features found in TASKS.md"
  exit 0
fi

echo "Approved features found:"
while IFS= read -r feature; do
  kebab=$(to_kebab "$feature")

  if fuzzy_match_prompt "$kebab" > /dev/null 2>&1; then
    echo "  ✓ $feature → prompts/$kebab.md"
  elif $USE_GENERIC && [[ -f "$PROMPTS_DIR/_generic.md" ]]; then
    echo "  ◇ $feature → prompts/_generic.md (generic fallback)"
  else
    echo "  ✗ $feature → No prompt for '$feature', skipping (needs manual prompt)"
  fi
done <<< "$features"

echo ""

# Find first spawnable feature
spawned=false
while IFS= read -r feature; do
  kebab=$(to_kebab "$feature")
  use_prompt=""

  if matched=$(fuzzy_match_prompt "$kebab" 2>&1); then
    use_prompt="$matched"
  elif $USE_GENERIC && [[ -f "$PROMPTS_DIR/_generic.md" ]]; then
    use_prompt="$PROMPTS_DIR/_generic.md"
  fi

  if [[ -n "$use_prompt" ]]; then
    if $DRY_RUN; then
      echo "[DRY RUN] Would spawn coder for: $feature"
      echo "  Prompt: $use_prompt"
      echo "  Would move '$feature' from Approved → In Progress"
      exit 0
    fi

    # Read model designation from prompt file (REQUIRED)
    PROMPT_MODEL=$(grep -oP '<!-- model: \K[a-z0-9-]+' "$use_prompt" | head -1)
    if [[ -z "$PROMPT_MODEL" ]]; then
      echo "  ✗ ERROR: No <!-- model: ... --> tag found in $use_prompt"
      echo "    Every prompt must have a model tag. Add one and retry."
      exit 1
    fi

    # Map model name to Claude CLI model flag
    case "$PROMPT_MODEL" in
      opus)    MODEL_FLAG="--model claude-opus-4-6" ;;
      sonnet)  MODEL_FLAG="--model claude-sonnet-4-6" ;;
      *)       MODEL_FLAG="--model $PROMPT_MODEL" ;;  # pass through for future models (codex, etc.)
    esac
    MODEL_DISPLAY="$PROMPT_MODEL"

    echo "Spawning coder for: $feature"
    echo "  Using prompt: $use_prompt"
    echo "  Model: $MODEL_DISPLAY"

    # Move feature to In Progress
    move_to_in_progress "$feature"
    echo "  Moved to In Progress in TASKS.md"

    # Spawn the coder agent
    prompt_content=$(cat "$use_prompt")
    claude -p "$prompt_content" $MODEL_FLAG --dangerously-skip-permissions &
    CODER_PID=$!

    # Register with tracker
    AGENT_ID=$("$TRACKER" start \
      --task "Build: $feature" \
      --project "$PROJECT_NAME" \
      --pid "$CODER_PID" \
      --model "$MODEL_DISPLAY")
    echo "  Agent tracked: id=$AGENT_ID pid=$CODER_PID"

    # Deploy + commit + push helper (sets DEPLOY_SUCCESS)
    do_deploy_commit_push() {
      DEPLOY_SUCCESS=true
      if [[ -f "$PROJECT_DIR/project.json" ]]; then
        AUTO_DEPLOY=$(python3 -c "import json; print(json.load(open('$PROJECT_DIR/project.json')).get('autoDeploy', False))" 2>/dev/null)
        if [[ "$AUTO_DEPLOY" == "True" ]] && [[ -f "$PROJECT_DIR/deploy.sh" ]]; then
          echo "  Auto-deploying..."
          if bash "$PROJECT_DIR/deploy.sh" 2>&1 | tee -a "/tmp/deploy-$PROJECT_NAME.log"; then
            echo "  Deploy successful ✓"
          else
            echo "  Deploy FAILED ✗"
            DEPLOY_SUCCESS=false
            local date_stamp
            date_stamp=$(date +%Y-%m-%d)
            if grep -q "## 🔴 Blocked" "$TASKS_FILE" 2>/dev/null; then
              sed -i "/## 🔴 Blocked/a\\- [ ] Deploy failed for $feature — check /tmp/deploy-$PROJECT_NAME.log ($date_stamp) [waiting:owner]" "$TASKS_FILE"
            else
              printf '\n## 🔴 Blocked\n- [ ] Deploy failed for %s — check /tmp/deploy-%s.log (%s) [waiting:owner]\n' \
                "$feature" "$PROJECT_NAME" "$date_stamp" >> "$TASKS_FILE"
            fi
            openclaw system event --text "⚠️ Deploy blocked: $feature ($PROJECT_NAME) — tests or build failed. Feature code is complete but not deployed." --mode now 2>/dev/null || true
          fi
        fi
      fi

      echo "  Committing changes..."
      cd "$PROJECT_DIR"
      git add -A
      if git diff --cached --quiet; then
        echo "  No changes to commit"
      else
        git commit -m "Feature: $feature" --no-verify
        if git push 2>&1; then
          echo "  Pushed to GitHub ✓"
        else
          echo "  Push failed (non-fatal)"
        fi
      fi
    }

    # Wait for agent and handle outcome
    if wait "$CODER_PID"; then
      echo "  Agent completed successfully"

      do_deploy_commit_push

      if $DEPLOY_SUCCESS; then
        "$TRACKER" complete "$AGENT_ID" --summary "Completed and deployed: $feature"
        openclaw system event --text "✅ Deployed: $feature ($PROJECT_NAME) — auto-deployed and pushed to GitHub" --mode now 2>/dev/null || true
      else
        "$TRACKER" complete "$AGENT_ID" --summary "Completed but deploy failed: $feature"
        openclaw system event --text "⚠️ Feature completed but deploy failed: $feature ($PROJECT_NAME) — check logs" --mode now 2>/dev/null || true
      fi

    else
      # Coder failed — try once more
      echo "  Agent failed. Retrying (attempt 2/2)..."

      DATE=$(date +%Y-%m-%d)
      mkdir -p "$PROJECT_DIR/memory"
      echo "## Agent Crash — $feature" >> "$PROJECT_DIR/memory/$DATE.md"
      echo "- First attempt failed at $(date +%H:%M)" >> "$PROJECT_DIR/memory/$DATE.md"
      echo "- Auto-retrying..." >> "$PROJECT_DIR/memory/$DATE.md"

      # Retry
      prompt_content=$(cat "$use_prompt")
      claude -p "$prompt_content" $MODEL_FLAG --dangerously-skip-permissions &
      RETRY_PID=$!

      "$TRACKER" error "$AGENT_ID" --message "First attempt failed, retrying"
      RETRY_ID=$("$TRACKER" start \
        --task "Retry: $feature" \
        --project "$PROJECT_NAME" \
        --pid "$RETRY_PID" \
        --model "$MODEL_DISPLAY")

      if wait "$RETRY_PID"; then
        echo "  Retry succeeded"

        do_deploy_commit_push

        "$TRACKER" complete "$RETRY_ID" --summary "Completed on retry: $feature"
        openclaw system event --text "✅ Deployed: $feature ($PROJECT_NAME) — succeeded on retry" --mode now 2>/dev/null || true

      else
        "$TRACKER" error "$RETRY_ID" --message "Second attempt also failed for: $feature"

        echo "- Retry also failed at $(date +%H:%M)" >> "$PROJECT_DIR/memory/$DATE.md"
        echo "- Marked as blocked" >> "$PROJECT_DIR/memory/$DATE.md"

        if grep -q "## 🔴 Blocked" "$TASKS_FILE" 2>/dev/null; then
          sed -i "/## 🔴 Blocked/a\\- [ ] $feature — coder agent failed twice ($DATE) [waiting:owner]" "$TASKS_FILE"
        else
          printf '\n## 🔴 Blocked\n- [ ] %s — coder agent failed twice (%s) [waiting:owner]\n' \
            "$feature" "$DATE" >> "$TASKS_FILE"
        fi

        openclaw system event --text "❌ Failed: $feature ($PROJECT_NAME) — coder crashed twice, marked as blocked, needs manual review" --mode now 2>/dev/null || true
      fi
    fi

    spawned=true
    break  # Only spawn one agent at a time
  fi
done <<< "$features"

if ! $spawned; then
  echo "No features had matching prompts. Write prompt files or use --use-generic."
  exit 1
fi
