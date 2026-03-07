#!/usr/bin/env bash
# check-prompts.sh — Verify all features in TASKS.md have correctly-named prompt files
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TASKS_FILE="$SCRIPT_DIR/../TASKS.md"
PROMPTS_DIR="$SCRIPT_DIR/../prompts"

if [[ ! -f "$TASKS_FILE" ]]; then
  echo "Error: TASKS.md not found at $TASKS_FILE" >&2
  exit 1
fi

echo "Checking prompt files for all features in TASKS.md..."
echo ""

missing=0
found=0

# Extract all ### feature headings (from all sections)
grep '^### ' "$TASKS_FILE" | sed 's/^### //' | sed 's/ (.*//' | while read -r feature; do
  kebab=$("$SCRIPT_DIR/to-kebab.sh" "$feature")
  if [[ -f "$PROMPTS_DIR/$kebab.md" ]]; then
    echo "  ✓ $feature → $kebab.md"
  else
    echo "  ✗ $feature → $kebab.md (MISSING)"
  fi
done
