#!/usr/bin/env bash
# to-kebab.sh — Single source of truth for feature name → prompt filename
# Usage: ./scripts/to-kebab.sh "Fix StatCards Data Sources"
# Output: fix-statcards-data-sources
echo "$1" | sed 's/ —.*//' | tr '[:upper:]' '[:lower:]' | sed 's/[[:space:]]/-/g; s/--*/-/g; s/[^a-z0-9-]//g; s/^-//; s/-$//'
