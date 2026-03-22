#!/bin/bash
# health-check.sh — Post-deploy validation: service running + endpoint responding
set -euo pipefail

SERVICE_NAME="command-center"
ENDPOINT="http://localhost:3000/api/heartbeat-status"

echo "=== Health Check ==="

HEALTHY=true

# Check systemd service is active
if systemctl --user is-active "$SERVICE_NAME" &>/dev/null; then
  echo "  Service ($SERVICE_NAME): active ✓"
else
  echo "  Service ($SERVICE_NAME): NOT active ✗"
  HEALTHY=false
fi

# Check HTTP endpoint responds
if curl -sf "$ENDPOINT" -o /dev/null 2>/dev/null; then
  echo "  Endpoint ($ENDPOINT): responding ✓"
else
  echo "  Endpoint ($ENDPOINT): NOT responding ✗"
  HEALTHY=false
fi

echo ""
if $HEALTHY; then
  echo "✓ Service is healthy"
else
  echo "✗ Health check failed"
  exit 1
fi
