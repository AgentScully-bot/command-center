#!/bin/bash
# verify.sh — Run all tests and write results to tests/last-run.json
# Exit 0 if all pass, exit 1 if any fail
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TESTS_DIR="$PROJECT_DIR/tests"
mkdir -p "$TESTS_DIR"

JSON_ONLY=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) JSON_ONLY=true; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

$JSON_ONLY || echo "=== Verify ==="

TEST_PASSED=true
SERVER_PASS=0
SERVER_FAIL=0
SERVER_TOTAL=0
SERVER_ERRORS='[]'
CLIENT_PASS=0
CLIENT_FAIL=0
CLIENT_TOTAL=0
CLIENT_ERRORS='[]'
TEST_START=$(date +%s%3N)

# Server tests
cd "$PROJECT_DIR/server"
if SERVER_OUTPUT=$(npm test -- --reporter=json 2>&1); then
  SERVER_PASS=$(echo "$SERVER_OUTPUT" | grep -oP '"numPassedTests":\s*\K\d+' | head -1 || echo "0")
  SERVER_TOTAL=$(echo "$SERVER_OUTPUT" | grep -oP '"numTotalTests":\s*\K\d+' | head -1 || echo "0")
  SERVER_FAIL=0
  $JSON_ONLY || echo "  Server tests: ${SERVER_PASS} passed ✓"
else
  TEST_PASSED=false
  SERVER_PASS=$(echo "$SERVER_OUTPUT" | grep -oP '"numPassedTests":\s*\K\d+' | head -1 || echo "0")
  SERVER_FAIL=$(echo "$SERVER_OUTPUT" | grep -oP '"numFailedTests":\s*\K\d+' | head -1 || echo "0")
  SERVER_TOTAL=$(echo "$SERVER_OUTPUT" | grep -oP '"numTotalTests":\s*\K\d+' | head -1 || echo "0")
  SERVER_ERRORS=$(echo "$SERVER_OUTPUT" | grep -oP '"fullName":\s*"\K[^"]+' | head -10 | jq -R -s 'split("\n") | map(select(. != ""))' 2>/dev/null || echo '[]')
  $JSON_ONLY || echo "  Server tests: FAILED (${SERVER_FAIL} failure(s)) ✗"
fi

# Client tests
cd "$PROJECT_DIR/client"
if CLIENT_OUTPUT=$(npm test -- --reporter=json 2>&1); then
  CLIENT_PASS=$(echo "$CLIENT_OUTPUT" | grep -oP '"numPassedTests":\s*\K\d+' | head -1 || echo "0")
  CLIENT_TOTAL=$(echo "$CLIENT_OUTPUT" | grep -oP '"numTotalTests":\s*\K\d+' | head -1 || echo "0")
  CLIENT_FAIL=0
  $JSON_ONLY || echo "  Client tests: ${CLIENT_PASS} passed ✓"
else
  TEST_PASSED=false
  CLIENT_PASS=$(echo "$CLIENT_OUTPUT" | grep -oP '"numPassedTests":\s*\K\d+' | head -1 || echo "0")
  CLIENT_FAIL=$(echo "$CLIENT_OUTPUT" | grep -oP '"numFailedTests":\s*\K\d+' | head -1 || echo "0")
  CLIENT_TOTAL=$(echo "$CLIENT_OUTPUT" | grep -oP '"numTotalTests":\s*\K\d+' | head -1 || echo "0")
  CLIENT_ERRORS=$(echo "$CLIENT_OUTPUT" | grep -oP '"fullName":\s*"\K[^"]+' | head -10 | jq -R -s 'split("\n") | map(select(. != ""))' 2>/dev/null || echo '[]')
  $JSON_ONLY || echo "  Client tests: FAILED (${CLIENT_FAIL} failure(s)) ✗"
fi

TEST_END=$(date +%s%3N)
DURATION_MS=$((TEST_END - TEST_START))
DURATION_S=$(echo "scale=1; $DURATION_MS / 1000" | bc)

# Write results to file
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

if ! $JSON_ONLY; then
  echo ""
  if [ "$TEST_PASSED" = true ]; then
    echo "✓ All tests passed (${DURATION_S}s)"
  else
    TOTAL_FAIL=$((SERVER_FAIL + CLIENT_FAIL))
    TOTAL_PASS=$((SERVER_PASS + CLIENT_PASS))
    echo "✗ Tests failed — ${TOTAL_FAIL} failure(s), ${TOTAL_PASS} passed (${DURATION_S}s)"
    echo "  See tests/last-run.json for details"
  fi
fi

if [ "$TEST_PASSED" = false ]; then
  exit 1
fi
