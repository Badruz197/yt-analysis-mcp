#!/bin/bash
# Installs dependencies and builds dist/ so the project .mcp.json server can start
# in Claude Code cloud sessions. dist/ and node_modules/ are not committed.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
npm run build
