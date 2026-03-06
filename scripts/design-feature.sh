#!/usr/bin/env bash
set -euo pipefail

# design-feature.sh — Spawn a designer agent to break a concept into tasks + coding prompt
#
# Usage: ./scripts/design-feature.sh <project-id> <request-id>

PROJECT_ID="$1"
REQUEST_ID="$2"

PROJECT_DIR="$HOME/projects/$PROJECT_ID"
REQUEST_FILE="$PROJECT_DIR/design-requests/$REQUEST_ID.json"

if [[ ! -f "$REQUEST_FILE" ]]; then
  echo "Error: Request file not found: $REQUEST_FILE" >&2
  exit 1
fi

# Update status to designing
jq '.status = "designing"' "$REQUEST_FILE" > "$REQUEST_FILE.tmp" && mv "$REQUEST_FILE.tmp" "$REQUEST_FILE"

# Read concept
CONCEPT=$(jq -r '.concept' "$REQUEST_FILE")

# Build the designer prompt
DESIGNER_PROMPT="You are a feature designer for a software project. Your job is to take a rough concept and turn it into a structured feature with concrete implementation tasks and a coding prompt.

## Project Context
Read these files to understand the project:
- $PROJECT_DIR/PROJECT.md — project overview
- $PROJECT_DIR/TASKS.md — existing tasks and patterns (study the format carefully)
- Browse $PROJECT_DIR/server/src/ and $PROJECT_DIR/client/src/ to understand the codebase

## The Concept
$CONCEPT

## Your Output (do both):

### 1. Add feature to TASKS.md
Open $PROJECT_DIR/TASKS.md and add a new feature block under the \"## 📋 Planned\" section.
Format:
\`\`\`
### <Feature Name>
- [ ] Backend: <specific task>
- [ ] Backend: <specific task>
- [ ] Frontend: <specific task>
- [ ] Frontend: <specific task>
\`\`\`

Guidelines for tasks:
- Be specific — include endpoint paths, component names, file locations
- Prefix with Backend/Frontend as appropriate
- Each task should be a single, implementable unit of work
- Study existing done features in TASKS.md for the level of detail expected
- Usually 4-10 tasks per feature

### 2. Create coding prompt
Create a file at $PROJECT_DIR/prompts/<feature-kebab-name>.md

The prompt should follow the pattern of existing prompts in $PROJECT_DIR/prompts/ — study them.
It must include:
- Context section (read PROJECT.md, TASKS.md, existing code)
- Detailed implementation instructions for each task
- Code patterns to follow (reference existing files)
- Testing checklist
- Task management section (mark tasks done, move feature to Done, fire completion event)

The kebab name should match: lowercase the feature name, replace spaces with hyphens, remove special chars.

### 3. Update the request status
After writing both files, run this command to update the status:
\`\`\`bash
cat > \"$REQUEST_FILE\" << 'STATUSEOF'
{
  \"requestId\": \"$REQUEST_ID\",
  \"status\": \"done\",
  \"featureName\": \"<THE FEATURE NAME YOU CHOSE>\",
  \"taskCount\": <NUMBER OF TASKS>,
  \"error\": null
}
STATUSEOF
\`\`\`

Replace <THE FEATURE NAME YOU CHOSE> and <NUMBER OF TASKS> with actual values.
Make sure the JSON is valid."

# Spawn claude in the project directory
cd "$PROJECT_DIR"
echo "$DESIGNER_PROMPT" | claude -p --dangerously-skip-permissions 2>&1 || true

# Verify status was updated by the agent
if ! jq -e '.status == "done"' "$REQUEST_FILE" > /dev/null 2>&1; then
  # Check if TASKS.md was modified (agent did work but didn't update status)
  if git diff --quiet TASKS.md 2>/dev/null; then
    # No changes at all — mark as error
    jq '.status = "error" | .error = "Agent completed but did not update files"' "$REQUEST_FILE" > "$REQUEST_FILE.tmp" && mv "$REQUEST_FILE.tmp" "$REQUEST_FILE"
  else
    # TASKS.md was modified — mark as done with unknown details
    jq '.status = "done" | .featureName = "Feature Added" | .taskCount = 0' "$REQUEST_FILE" > "$REQUEST_FILE.tmp" && mv "$REQUEST_FILE.tmp" "$REQUEST_FILE"
  fi
fi
