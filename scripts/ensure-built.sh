#!/bin/sh
# Installs dependencies and builds dist/ if either is missing. Called by both the
# SessionStart hook and start-mcp.sh, which can run at the same time when a cloud
# session starts; a mkdir lock makes the second caller wait instead of racing.
# All output goes to stderr so it never mixes with the MCP server's stdout.
set -eu

cd "$(dirname "$0")/.."
lock=.build.lock

# A lock older than 5 minutes is left over from a killed build: take it over.
waited=0
until mkdir "$lock" 2>/dev/null; do
  if [ "$waited" -ge 300 ]; then
    rmdir "$lock" 2>/dev/null || true
    waited=0
    continue
  fi
  sleep 1
  waited=$((waited + 1))
done
trap 'rmdir "$lock"' EXIT INT TERM

if [ ! -f dist/index.js ] || [ ! -d node_modules ]; then
  npm install --no-audit --no-fund >&2
  npm run build >&2
fi
